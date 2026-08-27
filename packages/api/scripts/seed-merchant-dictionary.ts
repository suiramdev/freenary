/**
 * Seed the merchant dictionary and intermediary catalogue into the database.
 *
 * Reads the committed merchants.jsonl.gz artifact via loadMerchantDictionary()
 * and upserts Merchant + MerchantAlias rows. Also seeds Intermediary rows from
 * the intermediary catalogue so Transaction.intermediaryId has valid FK targets.
 *
 * CONVERGES on removals: dictionary-derived rows absent from the current
 * artifact are deleted. User-created rows (source "user") are never touched.
 * Transaction.merchantId and DescriptorMemo.merchantId are ON DELETE SET NULL,
 * so stale references are safely nulled.
 *
 * Idempotent: re-running converges — upserts, prunes, no duplicates.
 *
 * Usage: bun scripts/seed-merchant-dictionary.ts
 */

import prisma from "@freenary/db";

import { loadMerchantDictionary } from "../src/categorisation/dictionary/load";
import { resetTokenIdf } from "../src/categorisation/idf";
import { INTERMEDIARY_CATALOGUE } from "../src/categorisation/intermediaries/catalogue";
import type { IntermediaryDefinition } from "../src/categorisation/intermediaries/types";

/** Sources that come from the dictionary build pipeline and are safe to prune. */
const DICTIONARY_SOURCES = ["nsi", "curated", "wikidata"] as const;

// ---------------------------------------------------------------------------
// Intermediaries
// ---------------------------------------------------------------------------

interface IntermediaryResult {
  pruned: number;
  upserted: number;
}

const seedAndPruneIntermediaries = async (): Promise<IntermediaryResult> => {
  // SAFETY: `satisfies` guarantees conformance; the cast restores the declared interface
  const defs = Object.values(
    INTERMEDIARY_CATALOGUE
  ) as readonly IntermediaryDefinition[];
  const catalogueIds = new Set<string>();

  for (const def of defs) {
    catalogueIds.add(def.id);
    // eslint-disable-next-line no-await-in-loop -- intermediary upserts must be sequential to avoid unique constraint races
    await prisma.intermediary.upsert({
      create: {
        ibans: def.ibans ? [...def.ibans] : [],
        id: def.id,
        name: def.name,
      },
      update: {
        ibans: def.ibans ? [...def.ibans] : [],
        name: def.name,
      },
      where: { id: def.id },
    });
  }

  // Prune intermediaries absent from catalogue (ON DELETE SET NULL on transaction FK)
  const pruned = await prisma.intermediary.deleteMany({
    where: {
      id: { notIn: [...catalogueIds] },
    },
  });

  return { pruned: pruned.count, upserted: defs.length };
};

// ---------------------------------------------------------------------------
// Merchants + Aliases
// ---------------------------------------------------------------------------

interface MerchantResult {
  aliasesPruned: number;
  aliasesUpserted: number;
  merchantsPruned: number;
  merchantsUpserted: number;
}

/**
 * Postgres has a parameter limit (~32767). For large NOT IN sets we chunk
 * the delete into batches of IDs. 5000 per chunk stays well within limits.
 */
const PRUNE_CHUNK_SIZE = 5000;

const seedAndPruneMerchants = async (): Promise<MerchantResult> => {
  let merchantsUpserted = 0;
  let aliasesUpserted = 0;

  // Track every id/alias pair seen in the artifact
  const artifactMerchantIds = new Set<string>();
  // Key format: merchantId + NUL + normalisedAlias
  const artifactAliasKeys = new Set<string>();

  // --- Phase 1: Upsert all merchants and collect alias data ---

  const allAliases: {
    alias: string;
    merchantId: string;
    normalisedAlias: string;
  }[] = [];

  for await (const entry of loadMerchantDictionary()) {
    artifactMerchantIds.add(entry.id);

    await prisma.$executeRaw`
      INSERT INTO "merchant" ("id", "name", "normalisedName", "category", "domains", "source", "createdAt")
      VALUES (${entry.id}, ${entry.name}, ${entry.normalisedName}, ${entry.category}, ${entry.domains}, ${entry.source}, NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "normalisedName" = EXCLUDED."normalisedName",
        "category" = EXCLUDED."category",
        "domains" = EXCLUDED."domains",
        "source" = EXCLUDED."source"
    `;

    merchantsUpserted += 1;
    if (merchantsUpserted % 2000 === 0) {
      console.log(`  merchants upserted: ${merchantsUpserted}...`);
    }

    for (const alias of entry.aliases) {
      allAliases.push({
        alias: alias.alias,
        merchantId: entry.id,
        normalisedAlias: alias.normalisedAlias,
      });
      artifactAliasKeys.add(`${entry.id}\0${alias.normalisedAlias}`);
    }
  }

  console.log(`  merchants upserted: ${merchantsUpserted} (final).`);

  // --- Phase 2: Upsert all aliases ---

  for (const a of allAliases) {
    // eslint-disable-next-line no-await-in-loop -- alias upserts must be sequential to avoid unique constraint races on (merchantId, normalisedAlias)
    await prisma.$executeRaw`
      INSERT INTO "merchant_alias" ("id", "merchantId", "alias", "normalisedAlias")
      VALUES (gen_random_uuid(), ${a.merchantId}, ${a.alias}, ${a.normalisedAlias})
      ON CONFLICT ("merchantId", "normalisedAlias") DO UPDATE SET
        "alias" = EXCLUDED."alias"
    `;
    aliasesUpserted += 1;
    if (aliasesUpserted % 5000 === 0) {
      console.log(`  aliases upserted: ${aliasesUpserted}...`);
    }
  }

  console.log(`  aliases upserted: ${aliasesUpserted} (final).`);

  // --- Phase 3: Prune stale merchants (dictionary-sourced only) ---

  // Fetch all dictionary-sourced merchant IDs currently in the DB
  const dbMerchantIds = await prisma.merchant.findMany({
    select: { id: true },
    where: { source: { in: [...DICTIONARY_SOURCES] } },
  });

  const staleMerchantIds = dbMerchantIds
    .filter((row) => !artifactMerchantIds.has(row.id))
    .map((row) => row.id);

  let merchantsPruned = 0;
  // Aliases of deleted merchants cascade via FK, but we chunk the merchant delete
  for (let i = 0; i < staleMerchantIds.length; i += PRUNE_CHUNK_SIZE) {
    const chunk = staleMerchantIds.slice(i, i + PRUNE_CHUNK_SIZE);
    // eslint-disable-next-line no-await-in-loop -- chunked deletes must be sequential to stay within parameter limits
    const result = await prisma.merchant.deleteMany({
      where: { id: { in: chunk } },
    });
    merchantsPruned += result.count;
  }

  // --- Phase 4: Prune stale aliases of SURVIVING merchants ---
  // (Aliases of deleted merchants already cascaded via FK)

  const dbAliases = await prisma.merchantAlias.findMany({
    select: { id: true, merchantId: true, normalisedAlias: true },
    where: { merchant: { source: { in: [...DICTIONARY_SOURCES] } } },
  });

  const staleAliasIds = dbAliases
    .filter(
      (row) =>
        !artifactAliasKeys.has(`${row.merchantId}\0${row.normalisedAlias}`)
    )
    .map((row) => row.id);

  let aliasesPruned = 0;
  for (let i = 0; i < staleAliasIds.length; i += PRUNE_CHUNK_SIZE) {
    const chunk = staleAliasIds.slice(i, i + PRUNE_CHUNK_SIZE);
    // eslint-disable-next-line no-await-in-loop -- chunked deletes must be sequential to stay within parameter limits
    const result = await prisma.merchantAlias.deleteMany({
      where: { id: { in: chunk } },
    });
    aliasesPruned += result.count;
  }

  return { aliasesPruned, aliasesUpserted, merchantsPruned, merchantsUpserted };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  console.log("Seeding intermediaries...");
  const intermediary = await seedAndPruneIntermediaries();
  console.log(
    `  ${intermediary.upserted} upserted, ${intermediary.pruned} pruned.`
  );

  console.log("Seeding merchant dictionary...");
  const merchant = await seedAndPruneMerchants();
  console.log(
    `  merchants: ${merchant.merchantsUpserted} upserted, ${merchant.merchantsPruned} pruned.`
  );
  console.log(
    `  aliases: ${merchant.aliasesUpserted} upserted, ${merchant.aliasesPruned} pruned.`
  );

  resetTokenIdf();
  console.log("Token IDF cache cleared.");

  console.log("Done.");
  process.exit(0);
};

try {
  await main();
} catch (error) {
  console.error("Seed failed:", error);
  process.exit(1);
}

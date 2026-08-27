/**
 * Fetches brand/chain entities from Wikidata SPARQL and writes an intermediate
 * JSON file for the merchant dictionary build.
 *
 * Wikidata (CC0 licence) carries 36k+ brand entities with multilingual aliases
 * and ~93% have an official website (P856). Selection uses direct P31 (instance
 * of) type matching against known commercial entity classes, with P856 as a
 * required filter. Per-type chunking stays well under the 60-second WDQS timeout.
 *
 * Phase 1: fetch entities + labels + websites grouped by type.
 * Phase 2: batch alias lookup by entity ID (VALUES clauses of ~150).
 *
 * Usage: bun packages/api/scripts/fetch-wikidata-brands.ts
 */
/* eslint-disable no-await-in-loop -- sequential SPARQL queries must respect WDQS rate limits */

import { writeFile } from "node:fs/promises";
import path from "node:path";

const ENDPOINT = "https://query.wikidata.org/sparql";
const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../data/wikidata-brands.json"
);

const USER_AGENT = "freenary-merchant-build/1.0 (https://freenary.com)";
const DELAY_MS = 1500;

/**
 * Wikidata types that cover consumer-facing commercial entities.
 * Direct P31 match only (no transitive P279* closure) to avoid WDQS timeouts.
 */
const ENTITY_TYPES = {
  Q1060829: "franchise",
  Q1589009: "startup company",
  Q161726: "multinational corporation",
  Q167037: "corporation",
  Q210167: "video game developer",
  Q2659904: "government-owned company",
  Q3918: "university",
  Q431289: "brand",
  Q4830453: "business",
  Q507619: "chain store",
  Q6881511: "enterprise",
  Q783794: "company",
  Q891723: "public company",
} as const satisfies Record<string, string>;

interface WikidataBrand {
  aliases: string[];
  domains: string[];
  id: string;
  label: string;
}

const extractDomain = (url: string): string | null => {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.toLowerCase().replace(/^www\./u, "");
  } catch {
    return null;
  }
};

const sleep = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(resolve, ms);
  return promise;
};

interface SparqlResults {
  results: {
    bindings: Record<string, { value: string }>[];
  };
}

const runQuery = async (
  query: string,
  label: string,
  retries = 2
): Promise<SparqlResults | null> => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(ENDPOINT, {
        body: `query=${encodeURIComponent(query)}`,
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        method: "POST",
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const wait = Math.min(30_000, 5000 * (attempt + 1));
          console.log(
            `  HTTP ${response.status} on ${label}, retry in ${wait / 1000}s…`
          );
          await sleep(wait);
          continue;
        }
        console.log(
          `  Failed ${label} after ${retries + 1} attempts: HTTP ${response.status}`
        );
        return null;
      }

      if (!response.ok) {
        console.log(`  Unexpected HTTP ${response.status} on ${label}`);
        return null;
      }

      // SAFETY: WDQS returns well-known SPARQL results JSON structure
      return (await response.json()) as SparqlResults;
    } catch (error) {
      if (attempt < retries) {
        const wait = 5000 * (attempt + 1);
        console.log(
          `  Network error on ${label}, retry in ${wait / 1000}s: ${error instanceof Error ? error.message : String(error)}`
        );
        await sleep(wait);
        continue;
      }
      console.log(
        `  Failed ${label}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
  return null;
};

// ── Phase 1: fetch entities by type ──────────────────────────────────────

const fetchEntitiesByType = async (
  typeQid: string,
  typeName: string
): Promise<Map<string, { domains: Set<string>; label: string }>> => {
  const query = `SELECT ?item ?itemLabel ?website WHERE {
  ?item wdt:P31 wd:${typeQid} .
  ?item wdt:P856 ?website .
  ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en")
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 }
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q4167410 }
} LIMIT 10000`;

  const data = await runQuery(query, `type ${typeQid} (${typeName})`);
  const result = new Map<string, { domains: Set<string>; label: string }>();

  if (!data) {
    return result;
  }

  for (const row of data.results.bindings) {
    const qid = row.item.value.split("/").pop() ?? row.item.value;
    const label = row.itemLabel.value;
    const domain = extractDomain(row.website.value);

    let entry = result.get(qid);
    if (!entry) {
      entry = { domains: new Set(), label };
      result.set(qid, entry);
    }
    if (domain) {
      entry.domains.add(domain);
    }
  }

  return result;
};

// ── Phase 2: batch alias lookup ──────────────────────────────────────────

const ALIAS_BATCH_SIZE = 400;

const fetchAliasesBatch = async (
  qids: string[]
): Promise<Map<string, string[]>> => {
  const values = qids.map((q) => `wd:${q}`).join(" ");
  const query = `SELECT ?item (GROUP_CONCAT(DISTINCT ?altLabel; separator="|") AS ?aliases) WHERE {
  VALUES ?item { ${values} }
  ?item skos:altLabel ?altLabel . FILTER(LANG(?altLabel) IN ("en", "fr"))
} GROUP BY ?item`;

  const data = await runQuery(query, `aliases batch (${qids.length} items)`);
  const result = new Map<string, string[]>();

  if (!data) {
    return result;
  }

  for (const row of data.results.bindings) {
    const qid = row.item.value.split("/").pop() ?? row.item.value;
    const aliasStr = row.aliases?.value ?? "";
    if (aliasStr.length > 0) {
      const aliases = aliasStr
        .split("|")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      if (aliases.length > 0) {
        result.set(qid, aliases);
      }
    }
  }

  return result;
};

// ── Main ─────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  // Phase 1: collect all entities across types
  const merged = new Map<string, { domains: Set<string>; label: string }>();

  console.log(
    `Phase 1: fetching entities by type (${Object.keys(ENTITY_TYPES).length} types)…`
  );

  for (const [typeQid, typeName] of Object.entries(ENTITY_TYPES)) {
    const entities = await fetchEntitiesByType(typeQid, typeName);

    let newCount = 0;
    for (const [qid, entry] of entities) {
      const existing = merged.get(qid);
      if (existing) {
        for (const d of entry.domains) {
          existing.domains.add(d);
        }
      } else {
        merged.set(qid, {
          domains: new Set(entry.domains),
          label: entry.label,
        });
        newCount += 1;
      }
    }

    console.log(
      `  ${typeQid} (${typeName}): ${entities.size} entities, ${newCount} new (total: ${merged.size})`
    );
    await sleep(DELAY_MS);
  }

  console.log(`\nPhase 1 complete: ${merged.size} unique entities`);

  // Phase 2: fetch aliases in batches
  const allQids = [...merged.keys()];
  const allAliases = new Map<string, string[]>();

  const batchCount = Math.ceil(allQids.length / ALIAS_BATCH_SIZE);
  console.log(
    `\nPhase 2: fetching aliases (${batchCount} batches of ${ALIAS_BATCH_SIZE})…`
  );

  for (let i = 0; i < allQids.length; i += ALIAS_BATCH_SIZE) {
    const batch = allQids.slice(i, i + ALIAS_BATCH_SIZE);
    const batchNum = Math.floor(i / ALIAS_BATCH_SIZE) + 1;
    const aliases = await fetchAliasesBatch(batch);

    for (const [qid, aliasList] of aliases) {
      allAliases.set(qid, aliasList);
    }

    if (batchNum % 10 === 0 || batchNum === batchCount) {
      console.log(
        `  Batch ${batchNum}/${batchCount}: ${allAliases.size} entities with aliases`
      );
    }

    if (i + ALIAS_BATCH_SIZE < allQids.length) {
      await sleep(DELAY_MS);
    }
  }

  // Assemble final output
  const brands: WikidataBrand[] = [];
  for (const [qid, entry] of merged) {
    const entityAliases = allAliases.get(qid) ?? [];
    // Remove aliases that duplicate the label
    const filteredAliases = entityAliases.filter((a) => a !== entry.label);

    brands.push({
      aliases: filteredAliases.toSorted(),
      domains: [...entry.domains].toSorted(),
      id: qid,
      label: entry.label,
    });
  }

  // Sort by Wikidata id for stable output
  const sorted = brands.toSorted((a, b) => a.id.localeCompare(b.id));

  await writeFile(OUTPUT_PATH, JSON.stringify(sorted, null, 2), "utf-8");
  console.log(`\nWrote ${sorted.length} brands to ${OUTPUT_PATH}`);
};

const run = async (): Promise<void> => {
  try {
    await main();
  } catch (error) {
    console.error("Fetch failed:", error);
    process.exit(1);
  }
};

run();

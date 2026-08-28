/**
 * Fetches brand/chain entities from Wikidata SPARQL and writes an intermediate
 * JSON file for the merchant dictionary build.
 *
 * Wikidata (CC0 licence) carries 36k+ brand entities with multilingual aliases
 * and ~93% have an official website (P856). Selection uses direct P31 (instance
 * of) type matching against known commercial entity classes, with P856 as a
 * required filter. Per-type chunking stays well under the 60-second WDQS timeout.
 *
 * Phase 0: SIRENE enrichment for curated merchants (French company registry).
 * Phase 1: fetch entities + labels + websites grouped by type.
 * Phase 1b: Wikidata lookup for curated merchants by label.
 * Phase 2: batch alias lookup by entity ID (VALUES clauses of ~150).
 *
 * Usage: bun packages/api/scripts/fetch-wikidata-brands.ts
 */
/* eslint-disable no-await-in-loop -- sequential SPARQL queries must respect WDQS rate limits */

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { CURATED_MERCHANTS } from "./lib/curated-merchants";
import { fetchSireneBatch } from "./lib/sirene-client";

const ENDPOINT = "https://query.wikidata.org/sparql";
const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../data/wikidata-brands.json"
);

const USER_AGENT = "freenary-merchant-build/1.0 (https://freenary.com)";
const DELAY_MS = 1500;

const CURATED_WIKIDATA_BATCH_SIZE = 10;

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

interface SireneResult {
  siren: string;
  nafCode: string;
  denomination: string;
  tradeName: string | null;
}

interface WikidataBrand {
  aliases: string[];
  domains: string[];
  id: string;
  label: string;
  sirene?: SireneResult;
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

// ── Phase 0: SIRENE enrichment for curated merchants ─────────────────────

interface SireneApiEtablissement {
  siren: string;
  activite_principale: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  nom_commercial?: string | null;
}

interface SireneApiResult {
  results: {
    matching_etablissements: SireneApiEtablissement[];
    nom_complet?: string;
    nom_raison_sociale?: string;
    siren?: string;
    activite_principale?: string;
  }[];
  total_results: number;
}

const parseSireneResult = (
  raw: unknown,
  name: string
): SireneResult | null => {
  const data = raw as SireneApiResult;
  if (!data.results?.length) {
    return null;
  }
  const topResult = data.results[0];
  if (!topResult) {
    return null;
  }
  const etab = topResult.matching_etablissements?.[0];
  if (!etab) {
    return null;
  }
  return {
    denomination:
      topResult.nom_complet ?? topResult.nom_raison_sociale ?? name,
    nafCode: etab.activite_principale,
    siren: etab.siren,
    tradeName: etab.nom_commercial ?? null,
  };
};

const fetchSireneForCuratedMerchants = async (): Promise<
  Map<string, SireneResult>
> => {
  const names = CURATED_MERCHANTS.map((m) => m.name);
  console.log(
    `Phase 0: querying SIRENE for ${names.length} curated merchants…`
  );

  const results = await fetchSireneBatch(names, parseSireneResult, (done, total) => {
    if (done % 20 === 0 || done === total) {
      console.log(`  ${done}/${total} queried`);
    }
  });

  const sireneMap = new Map<string, SireneResult>();
  for (const { query, data } of results) {
    if (data) {
      sireneMap.set(query, data);
    }
  }

  console.log(`  ${sireneMap.size}/${names.length} matched`);
  return sireneMap;
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

// ── Phase 1b: Wikidata lookup for curated merchants ─────────────────────

const fetchCuratedFromWikidata = async (
  names: string[],
  merged: Map<string, { domains: Set<string>; label: string }>
): Promise<void> => {
  console.log(
    `\nPhase 1b: querying Wikidata for ${names.length} curated merchant names…`
  );

  for (let i = 0; i < names.length; i += CURATED_WIKIDATA_BATCH_SIZE) {
    const batch = names.slice(i, i + CURATED_WIKIDATA_BATCH_SIZE);
    const valuesClause = batch
      .map((n) => `"${n.replaceAll('"', '\\"')}"@en`)
      .join(" ");

    const query = `SELECT ?item ?itemLabel ?website WHERE {
  VALUES ?searchLabel { ${valuesClause} }
  ?item rdfs:label ?searchLabel .
  OPTIONAL { ?item wdt:P856 ?website }
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 }
}
ORDER BY ?item ?website
LIMIT ${batch.length * 50}`;

    const batchNum = Math.floor(i / CURATED_WIKIDATA_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(names.length / CURATED_WIKIDATA_BATCH_SIZE);
    const data = await runQuery(
      query,
      `curated batch ${batchNum}/${totalBatches}`
    );

    if (data) {
      let batchNew = 0;
      for (const row of data.results.bindings) {
        const itemVal = row.item;
        const labelVal = row.itemLabel;
        if (!itemVal || !labelVal) {
          continue;
        }
        const qid = itemVal.value.split("/").pop() ?? itemVal.value;
        const label = labelVal.value;
        const domain = row.website ? extractDomain(row.website.value) : null;

        let entry = merged.get(qid);
        if (!entry) {
          entry = { domains: new Set(), label };
          merged.set(qid, entry);
          batchNew += 1;
        }
        if (domain) {
          entry.domains.add(domain);
        }
      }
      console.log(
        `  Batch ${batchNum}/${totalBatches}: ${batch.length} names, ${batchNew} new entities`
      );
    }

    if (i + CURATED_WIKIDATA_BATCH_SIZE < names.length) {
      await sleep(DELAY_MS);
    }
  }
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
  // Phase 0: SIRENE enrichment for curated merchants
  const sireneMap = await fetchSireneForCuratedMerchants();
  console.log(
    `\nPhase 0 complete: ${sireneMap.size}/${CURATED_MERCHANTS.length} curated merchants matched in SIRENE`
  );

  // Phase 1: collect all entities across types
  const merged = new Map<string, { domains: Set<string>; label: string }>();

  console.log(
    `\nPhase 1: fetching entities by type (${Object.keys(ENTITY_TYPES).length} types)…`
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

  // Phase 1b: Wikidata lookup for curated merchants by label
  const curatedNames = CURATED_MERCHANTS.map((m) => m.name);
  await fetchCuratedFromWikidata(curatedNames, merged);
  console.log(
    `Phase 1b complete: ${merged.size} total entities after curated lookup`
  );

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

  // Build label-to-sirene lookup for curated merchants
  const labelToSirene = new Map<string, SireneResult>();
  for (const [name, sirene] of sireneMap) {
    labelToSirene.set(name.toLowerCase(), sirene);
  }

  // Assemble final output
  const brands: WikidataBrand[] = [];
  for (const [qid, entry] of merged) {
    const entityAliases = allAliases.get(qid) ?? [];
    const filteredAliases = entityAliases.filter((a) => a !== entry.label);
    const sirene = labelToSirene.get(entry.label.toLowerCase());

    const brand: WikidataBrand = {
      aliases: filteredAliases.toSorted(),
      domains: [...entry.domains].toSorted(),
      id: qid,
      label: entry.label,
    };
    if (sirene) {
      brand.sirene = sirene;
    }
    brands.push(brand);
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
    console.warn(
      `Warning: Wikidata brand fetch failed, continuing without it: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

run();

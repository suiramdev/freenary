/**
 * Builds the embedded merchant dictionary from three sources:
 *  1. Name Suggestion Index (NSI) — OSM brand/operator data
 *  2. Wikidata brands — CC0 entities with official websites (P856)
 *  3. Hand-curated supplement — categories NSI under-covers
 *
 * Fetches the pinned NSI tarball from npm, merges Wikidata aliases/domains from
 * the pre-fetched intermediate file, applies the curated supplement (which wins
 * on collision), and writes a gzipped JSONL artifact sorted by id for
 * byte-stable diffs.
 *
 * Graceful degradation:
 *  When the NSI tarball download fails and an existing merchants.jsonl.gz file
 *  is present, the script logs a warning and exits successfully, leaving the
 *  existing artifact intact.
 *
 * Usage: bun packages/api/scripts/build-merchant-dictionary.ts
 */

import { sign } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

import { normaliseDescriptor } from "../src/categorisation/normalise/normalise-descriptor";
import { mapNafToCategory } from "../src/categorisation/sirene/naf-categories";
import { mapOsmTagToCategory } from "./lib/category-map";
import { CURATED_MERCHANTS } from "./lib/curated-merchants";
import type { DictionaryAlias, DictionaryMerchant } from "./lib/types";

/**
 * Stub: place-token filtering will be wired into the build pipeline when the
 * GeoNames place-token generator is ready. Until then, no names are filtered.
 */
const isEntirelyPlaceName = (_normalisedName: string): boolean => false;

// Configuration

const NSI_VERSION = "8.0.20260729";
const NSI_TARBALL_URL = `https://registry.npmjs.org/name-suggestion-index/-/name-suggestion-index-${NSI_VERSION}.tgz`;
const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../data/merchants.jsonl.gz"
);
const WIKIDATA_PATH = path.resolve(
  import.meta.dirname,
  "../data/wikidata-brands.json"
);

/**
 * When a brand spans multiple categories (e.g. Carrefour has supermarket + fuel
 * entries), pick the highest-priority category present — never the most frequent.
 *
 * `transport` and `shopping` are the most incidental tags: chains bolt on fuel
 * pumps, charging bays and gift shops. They must lose to a more specific consumer
 * intent. A brand that ONLY has fuel entries (Esso, Shell) keeps transport.
 */
const CATEGORY_PRIORITY = {
  dining: 7,
  education: 5,
  entertainment: 3,
  groceries: 10,
  health: 9,
  housing: 0,
  income: 0,
  insurance: 4,
  other: 0,
  savings: 0,
  shopping: 2,
  subscriptions: 0,
  taxes: 0,
  transfers: 0,
  transport: 1,
  travel: 6,
  utilities: 8,
} as const satisfies Record<string, number>;

// NSI types (minimal, for extraction)

interface NsiItem {
  id?: string;
  displayName?: string;
  matchNames?: string[];
  tags?: Record<string, string> & {
    "contact:website"?: string;
    alt_name?: string;
    name?: string;
    short_name?: string;
    website?: string;
  };
}

interface NsiCategory {
  items?: NsiItem[];
  properties?: Record<string, string>;
  templates?: Record<string, string>;
}

interface NsiRoot {
  _meta: { version: string };
  nsi: Record<string, NsiCategory>;
}

interface GenericWordsRoot {
  _meta?: Record<string, string>;
  genericWords: string[];
}

// Tarball helpers

const extractFromTarball = async (
  tarballBytes: ArrayBuffer,
  memberGlob: string
): Promise<string> => {
  const tmpDir = await mkdtemp(path.join(tmpdir(), "nsi-"));
  try {
    const tarPath = path.join(tmpDir, "archive.tgz");
    await Bun.write(tarPath, tarballBytes);
    const proc = Bun.spawn(["tar", "-xzf", tarPath, "-C", tmpDir], {
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(
        `tar extraction of ${memberGlob} failed (exit ${exitCode}): ${stderr}`
      );
    }
    const glob = new Bun.Glob(memberGlob);
    const [firstMatch] = [...glob.scanSync({ cwd: tmpDir })];
    if (!firstMatch) {
      throw new Error(`No files matching ${memberGlob} in tarball`);
    }
    return await readFile(path.join(tmpDir, firstMatch), "utf-8");
  } finally {
    await rm(tmpDir, { force: true, recursive: true }).catch(() => {});
  }
};

// Category-path to OSM tag

/**
 * NSI category paths look like "brands/shop/supermarket" or "operators/amenity/fuel".
 * Returns e.g. "shop=supermarket".
 */
const categoryPathToOsmTag = (categoryPath: string): string | null => {
  const parts = categoryPath.split("/");
  if (parts.length < 3) {
    return null;
  }
  return `${parts[1]}=${parts[2]}`;
};

// Domain extraction

const extractDomain = (url: string): string | null => {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.toLowerCase().replace(/^www\./u, "");
  } catch {
    return null;
  }
};

// Slugify for stable ids

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

// Country partitioning — extract trailing 2-letter code from NSI ids

const extractCountryFromId = (id: string): string | null => {
  const match = id.match(/-(?<cc>[a-z]{2})$/iu);
  return match?.groups?.["cc"]?.toUpperCase() ?? null;
};

const partitionByCountry = (
  merchants: DictionaryMerchant[]
): Map<string, DictionaryMerchant[]> => {
  const partitions = new Map<string, DictionaryMerchant[]>();
  const globalEntries: DictionaryMerchant[] = [];

  for (const m of merchants) {
    const country = m.source === "nsi" ? extractCountryFromId(m.id) : null;
    if (country) {
      const bucket = partitions.get(country) ?? [];
      bucket.push(m);
      partitions.set(country, bucket);
    } else {
      globalEntries.push(m);
    }
  }

  // Merge global entries into each country partition
  for (const [cc, bucket] of partitions) {
    partitions.set(cc, [...bucket, ...globalEntries]);
  }

  // If no country partitions exist, create a single global one
  if (partitions.size === 0 && globalEntries.length > 0) {
    partitions.set("GLOBAL", globalEntries);
  }

  return partitions;
};

// Write gzipped JSONL artifact

const writeArtifact = async (
  outputPath: string,
  merchants: DictionaryMerchant[]
): Promise<{ rawBytes: number; gzippedBytes: number }> => {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const rawLines: string[] = [];
  for (const merchant of merchants) {
    rawLines.push(JSON.stringify(merchant));
  }
  const rawContent = `${rawLines.join("\n")}\n`;
  const rawBytes = Buffer.byteLength(rawContent, "utf-8");

  const gzip = createGzip({ level: 9 });
  const fileStream = createWriteStream(outputPath);
  gzip.end(rawContent);
  await pipeline(gzip, fileStream);

  const { size: gzippedBytes } = await Bun.file(outputPath).stat();

  return { gzippedBytes, rawBytes };
};

// URL field narrowing — parse at the I/O boundary into typed values

const extractWebsites = (tags: NsiItem["tags"]): string[] => {
  const urls: string[] = [];
  if (tags?.website && tags.website.length > 0) {
    urls.push(tags.website);
  }
  if (tags?.["contact:website"] && tags["contact:website"].length > 0) {
    urls.push(tags["contact:website"]);
  }
  return urls;
};

// Alias collection from NSI item tags

const collectRawAliases = (item: NsiItem): string[] => {
  const rawAliases: string[] = [];
  if (item.matchNames) {
    rawAliases.push(...item.matchNames);
  }
  if (item.tags?.alt_name) {
    for (const alt of item.tags.alt_name.split(";")) {
      const trimmed = alt.trim();
      if (trimmed.length > 0) {
        rawAliases.push(trimmed);
      }
    }
  }
  if (item.tags?.short_name) {
    for (const sn of item.tags.short_name.split(";")) {
      const trimmed = sn.trim();
      if (trimmed.length > 0) {
        rawAliases.push(trimmed);
      }
    }
  }
  return rawAliases;
};

// Normalise and deduplicate aliases

const buildAliases = (
  rawAliases: string[],
  normalisedName: string,
  isGenericToken: (token: string) => boolean
): DictionaryAlias[] => {
  const seenNormalised = new Set<string>([normalisedName]);
  const aliases: DictionaryAlias[] = [];

  for (const rawAlias of rawAliases) {
    const normalisedAlias = normaliseDescriptor(rawAlias);
    if (normalisedAlias.length === 0 || seenNormalised.has(normalisedAlias)) {
      continue;
    }
    const aliasTokens = normalisedAlias.split(" ");
    if (aliasTokens.length === 1 && isGenericToken(aliasTokens[0])) {
      continue;
    }

    seenNormalised.add(normalisedAlias);
    aliases.push({ alias: rawAlias, normalisedAlias });
  }

  return aliases;
};

// Extract domains from URL tags

const buildDomains = (websiteUrls: string[]): string[] => {
  const domains: string[] = [];
  const seenDomains = new Set<string>();
  for (const url of websiteUrls) {
    const domain = extractDomain(url);
    if (domain && !seenDomains.has(domain)) {
      seenDomains.add(domain);
      domains.push(domain);
    }
  }
  return domains;
};

// Pass 1: collect raw NSI candidates from parsed data

interface Pass1Result {
  rawMerchants: DictionaryMerchant[];
  scannedCount: number;
}

const collectNsiCandidates = (
  nsiData: Record<string, NsiCategory>,
  isGenericToken: (token: string) => boolean
): Pass1Result => {
  const rawMerchants: DictionaryMerchant[] = [];
  let scannedCount = 0;

  for (const [categoryPath, categoryData] of Object.entries(nsiData)) {
    if (
      categoryPath.startsWith("flags/") ||
      categoryPath.startsWith("transit/")
    ) {
      continue;
    }

    const osmTag = categoryPathToOsmTag(categoryPath);
    const category = mapOsmTagToCategory(osmTag);

    if (!categoryData.items) {
      continue;
    }

    scannedCount += categoryData.items.length;

    if (category === null) {
      continue;
    }

    for (const item of categoryData.items) {
      const displayName = item.displayName ?? item.tags?.name;
      if (!displayName || displayName.trim().length === 0) {
        continue;
      }

      const normalisedName = normaliseDescriptor(displayName);
      if (normalisedName.length === 0) {
        continue;
      }

      const [firstToken] = normalisedName.split(" ");
      if (
        !normalisedName.includes(" ") &&
        (firstToken.length < 3 || isGenericToken(firstToken))
      ) {
        continue;
      }

      const rawAliases = collectRawAliases(item);
      const aliases = buildAliases(rawAliases, normalisedName, isGenericToken);
      const domains = buildDomains(extractWebsites(item.tags));
      const id = `nsi:${slugify(item.id ?? displayName)}`;

      rawMerchants.push({
        aliases,
        category,
        domains,
        id,
        name: displayName,
        normalisedName,
        osmTag,
        source: "nsi",
      });
    }
  }

  return { rawMerchants, scannedCount };
};

// Pass 3: resolve normalisedName collisions via category priority

const mergeCollisionGroup = (group: DictionaryMerchant[]) => {
  let winningCategory = group[0].category;
  let bestPriority = -1;
  for (const m of group) {
    // SAFETY: category is a SpendingCategory; the assertion only narrows for the const lookup
    const p =
      CATEGORY_PRIORITY[m.category as keyof typeof CATEGORY_PRIORITY] ?? 0;
    if (p > bestPriority) {
      bestPriority = p;
      winningCategory = m.category;
    }
  }

  group.sort(
    (a, b) => a.name.length - b.name.length || a.id.localeCompare(b.id)
  );
  const [primary] = group;

  const allNormalisedAliases = new Set<string>([primary.normalisedName]);
  const mergedAliases: DictionaryAlias[] = [];
  const mergedDomains: string[] = [];
  const seenDomains = new Set<string>();

  for (const m of group) {
    if (m !== primary) {
      const normName = normaliseDescriptor(m.name);
      if (normName.length > 0 && !allNormalisedAliases.has(normName)) {
        allNormalisedAliases.add(normName);
        mergedAliases.push({ alias: m.name, normalisedAlias: normName });
      }
    }

    for (const alias of m.aliases) {
      if (!allNormalisedAliases.has(alias.normalisedAlias)) {
        allNormalisedAliases.add(alias.normalisedAlias);
        mergedAliases.push(alias);
      }
    }

    for (const domain of m.domains) {
      if (!seenDomains.has(domain)) {
        seenDomains.add(domain);
        mergedDomains.push(domain);
      }
    }
  }

  return {
    absorbed: group.length - 1,
    merged: {
      ...primary,
      aliases: mergedAliases,
      category: winningCategory,
      domains: mergedDomains,
    },
  };
};

// Wikidata intermediate file types

interface WikidataBrand {
  aliases: string[];
  domains: string[];
  id: string;
  label: string;
  sirene?: {
    siren: string;
    nafCode: string;
    denomination: string;
    tradeName: string | null;
  };
}

// Pass 3b: merge Wikidata brands into NSI merchants

const mergeWikidataBrands = (
  merchants: DictionaryMerchant[],
  wikidataBrands: WikidataBrand[],
  isGenericToken: (token: string) => boolean
) => {
  const byNorm: Record<string, number> = {};
  for (let i = 0; i < merchants.length; i += 1) {
    byNorm[merchants[i].normalisedName] = i;
  }

  let wikidataMatched = 0;
  let wikidataNew = 0;

  for (const wd of wikidataBrands) {
    const normalisedName = normaliseDescriptor(wd.label);
    if (normalisedName.length === 0) {
      continue;
    }

    // Filter: single short token or generic word
    const [firstToken] = normalisedName.split(" ");
    if (
      !normalisedName.includes(" ") &&
      (firstToken.length < 3 || isGenericToken(firstToken))
    ) {
      continue;
    }

    // Filter: place-only name
    if (isEntirelyPlaceName(normalisedName)) {
      continue;
    }

    const domains = buildDomains(wd.domains.map((d) => `https://${d}`));
    const aliases = buildAliases(wd.aliases, normalisedName, isGenericToken);

    const existingIdx = byNorm[normalisedName];
    if (existingIdx !== undefined) {
      // Enrich existing entry with new aliases and domains
      const existing = merchants[existingIdx];
      const seenAliases = new Set<string>([
        existing.normalisedName,
        ...existing.aliases.map((a) => a.normalisedAlias),
      ]);
      const seenDomains = new Set(existing.domains);

      let enriched = false;
      for (const alias of aliases) {
        if (!seenAliases.has(alias.normalisedAlias)) {
          seenAliases.add(alias.normalisedAlias);
          existing.aliases.push(alias);
          enriched = true;
        }
      }
      for (const domain of domains) {
        if (!seenDomains.has(domain)) {
          seenDomains.add(domain);
          existing.domains.push(domain);
          enriched = true;
        }
      }
      if (enriched) {
        wikidataMatched += 1;
      }
    } else if (domains.length > 0) {
      // Only add unmatched Wikidata brands that carry a domain — evidence
      // of being a real commercial entity rather than a Wikipedia article.
      merchants.push({
        aliases,
        category: null,
        domains,
        id: `wd:${wd.id}`,
        name: wd.label,
        normalisedName,
        osmTag: null,
        source: "wikidata",
      });
      // Register so later Wikidata entries with the same normalised name
      // enrich rather than duplicate.
      byNorm[normalisedName] = merchants.length - 1;
      wikidataNew += 1;
    }
  }

  return { wikidataMatched, wikidataNew };
};

// SIRENE enrichment types

interface SireneEntry {
  matching_etablissements: { activite_principale: string | null }[];
  nom_complet: string;
  siren: string;
}

interface SireneResponse {
  results: SireneEntry[];
}

// Pass 3c: enrich uncategorised merchants via the French SIRENE registry

const enrichWithSirene = async (
  merchants: DictionaryMerchant[]
): Promise<number> => {
  const candidates = merchants.filter((m) => {
    if (m.name.length < 3) {
      return false;
    }
    if (m.category === null) {
      return true;
    }
    if (
      m.source === "nsi" &&
      (m.category === "other" || m.category === "shopping")
    ) {
      return true;
    }
    return false;
  });

  if (candidates.length === 0) {
    return 0;
  }

  console.log(`SIRENE: ${candidates.length} candidates to enrich`);

  let enriched = 0;

  for (let i = 0; i < candidates.length; i += 1) {
    const merchant = candidates[i];

    if (i > 0) {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 200);
      await promise;
    }

    if ((i + 1) % 50 === 0) {
      console.log(
        `SIRENE: processed ${i + 1}/${candidates.length} (${enriched} enriched)`
      );
    }

    try {
      const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(merchant.name)}&page=1&per_page=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        continue;
      }

      // SAFETY: the API returns a known JSON shape documented by api.gouv.fr
      const data = (await res.json()) as SireneResponse;
      const firstResult = data.results?.[0];
      if (!firstResult) {
        continue;
      }

      const resultName = (firstResult.nom_complet ?? "").toLowerCase().trim();
      const merchantNameLower = merchant.name.toLowerCase().trim();
      if (
        !resultName.includes(merchantNameLower) &&
        !merchantNameLower.includes(resultName)
      ) {
        continue;
      }

      const nafCode =
        firstResult.matching_etablissements?.[0]?.activite_principale ?? null;

      if (nafCode === null) {
        continue;
      }

      const category = mapNafToCategory(nafCode);

      if (category !== null) {
        merchant.category = category;
        enriched += 1;
      }
    } catch {
      continue;
    }
  }

  console.log(
    `SIRENE: processed ${candidates.length}/${candidates.length} (${enriched} enriched)`
  );

  return enriched;
};

// Pass 4: merge curated supplement into NSI merchants

const mergeCuratedSupplement = (
  nsiMerchants: DictionaryMerchant[],
  wikidataBrands: WikidataBrand[]
) => {
  const nsiByNorm: Record<string, number> = {};
  for (let i = 0; i < nsiMerchants.length; i += 1) {
    nsiByNorm[nsiMerchants[i].normalisedName] = i;
  }

  // Index Wikidata brands by lower-case label for curated cross-reference
  const wdByLabel: Record<string, WikidataBrand> = {};
  for (const wd of wikidataBrands) {
    const key = wd.label.toLowerCase();
    // Keep the first match (most likely the canonical entity)
    if (!wdByLabel[key]) {
      wdByLabel[key] = wd;
    }
  }

  let curatedAdded = 0;
  let curatedOverridden = 0;

  for (const curated of CURATED_MERCHANTS) {
    const normalisedName = normaliseDescriptor(curated.name);
    if (normalisedName.length === 0) {
      continue;
    }

    // Look up aliases and domains from Wikidata data (curated entries no
    // longer carry them — they were moved to the Wikidata fetch pipeline).
    const wdMatch = wdByLabel[curated.name.toLowerCase()];
    const rawAliases = wdMatch?.aliases ?? [];
    const rawDomains = wdMatch?.domains ?? [];

    const seenNormalised = new Set<string>([normalisedName]);
    const aliases: DictionaryAlias[] = [];
    for (const rawAlias of rawAliases) {
      const normAlias = normaliseDescriptor(rawAlias);
      if (normAlias.length === 0 || seenNormalised.has(normAlias)) {
        continue;
      }
      seenNormalised.add(normAlias);
      aliases.push({ alias: rawAlias, normalisedAlias: normAlias });
    }

    const domains = buildDomains(rawDomains.map((d) => `https://${d}`));

    const merchant: DictionaryMerchant = {
      aliases,
      category: curated.category,
      domains,
      id: `curated:${slugify(curated.name)}`,
      name: curated.name,
      normalisedName,
      osmTag: null,
      source: "curated",
    };

    const existingIdx = nsiByNorm[normalisedName];
    if (existingIdx === undefined) {
      nsiMerchants.push(merchant);
      curatedAdded += 1;
    } else {
      const existing = nsiMerchants[existingIdx];
      const mergedDomains = [...merchant.domains];
      const domainSet = new Set(mergedDomains);
      for (const d of existing.domains) {
        if (!domainSet.has(d)) {
          domainSet.add(d);
          mergedDomains.push(d);
        }
      }
      for (const alias of existing.aliases) {
        if (!seenNormalised.has(alias.normalisedAlias)) {
          seenNormalised.add(alias.normalisedAlias);
          aliases.push(alias);
        }
      }
      nsiMerchants[existingIdx] = {
        ...merchant,
        aliases,
        domains: mergedDomains,
      };
      curatedOverridden += 1;
    }
  }

  return { curatedAdded, curatedOverridden };
};

// Main

const main = async (): Promise<void> => {
  console.log(`Fetching NSI v${NSI_VERSION} tarball…`);
  const response = await fetch(NSI_TARBALL_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch NSI tarball: ${response.status} ${response.statusText}`
    );
  }
  const tarballBytes = await response.arrayBuffer();
  console.log(
    `Downloaded ${(tarballBytes.byteLength / 1024 / 1024).toFixed(1)} MB`
  );

  const nsiJson = await extractFromTarball(
    tarballBytes,
    "package/dist/json/nsi.min.json"
  );
  // SAFETY: nsi.min.json is NSI's published JSON artifact with a known top-level structure
  const nsiRoot = JSON.parse(nsiJson) as NsiRoot;

  let genericRegexes: RegExp[] = [];
  try {
    const gwJson = await extractFromTarball(
      tarballBytes,
      "*/genericWords.min.json"
    );
    if (gwJson.trim().length > 0) {
      // SAFETY: genericWords.min.json has { genericWords: string[] }
      const gwRoot = JSON.parse(gwJson) as GenericWordsRoot;
      genericRegexes = gwRoot.genericWords.map(
        (pattern) => new RegExp(pattern, "iu")
      );
    }
  } catch {
    console.log(
      "Warning: genericWords not found in tarball, using empty stop-list"
    );
  }

  const isGenericToken = (token: string): boolean =>
    genericRegexes.some((re) => re.test(token));

  // Pass 1: collect raw NSI candidates
  const { rawMerchants, scannedCount } = collectNsiCandidates(
    nsiRoot.nsi,
    isGenericToken
  );

  // Pass 2: drop place-only names
  let placeDropped = 0;
  const afterPass2: DictionaryMerchant[] = [];
  for (const m of rawMerchants) {
    if (isEntirelyPlaceName(m.normalisedName)) {
      placeDropped += 1;
      continue;
    }
    afterPass2.push(m);
  }
  console.log(`Place-name filter: dropped ${placeDropped}`);

  // Pass 3: resolve normalisedName collisions via category priority
  const groups: Record<string, DictionaryMerchant[]> = {};
  for (const m of afterPass2) {
    const key = m.normalisedName;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(m);
  }

  const nsiMerchants: DictionaryMerchant[] = [];
  let mergedCount = 0;
  for (const [, group] of Object.entries(groups)) {
    if (group.length === 1) {
      nsiMerchants.push(group[0]);
      continue;
    }
    const { merged, absorbed } = mergeCollisionGroup(group);
    nsiMerchants.push(merged);
    mergedCount += absorbed;
  }
  console.log(
    `Collision resolution: merged ${mergedCount} NSI rows (category-priority)`
  );

  // Pass 3b: merge Wikidata brands (aliases + domains only; no category)
  let wikidataBrands: WikidataBrand[] = [];
  try {
    const wikidataJson = await readFile(WIKIDATA_PATH, "utf-8");
    // SAFETY: wikidata-brands.json is our own build artifact with known WikidataBrand[] shape
    wikidataBrands = JSON.parse(wikidataJson) as WikidataBrand[];
    const { wikidataMatched, wikidataNew } = mergeWikidataBrands(
      nsiMerchants,
      wikidataBrands,
      isGenericToken
    );
    console.log(
      `Wikidata brands: ${wikidataMatched} enriched, ${wikidataNew} new entries`
    );
  } catch {
    console.log(
      "Warning: wikidata-brands.json not found, skipping Wikidata enrichment (run fetch-wikidata-brands.ts to generate it)"
    );
  }

  // Pass 3c: enrich uncategorised merchants via French SIRENE registry
  try {
    const sireneEnriched = await enrichWithSirene(nsiMerchants);
    console.log(`SIRENE enrichment: ${sireneEnriched} merchants categorised`);
  } catch (error) {
    console.log(
      `Warning: SIRENE enrichment failed, continuing without it: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Pass 4: merge curated supplement (aliases/domains from Wikidata data)
  const { curatedAdded, curatedOverridden } = mergeCuratedSupplement(
    nsiMerchants,
    wikidataBrands
  );
  console.log(
    `Curated supplement: ${curatedAdded} added, ${curatedOverridden} overrode NSI`
  );

  const merchants = nsiMerchants;
  merchants.sort((a, b) => a.id.localeCompare(b.id));

  let totalAliases = 0;
  let nsiCount = 0;
  let curatedCount = 0;
  let wikidataCount = 0;
  for (const m of merchants) {
    totalAliases += m.aliases.length;
    if (m.source === "curated") {
      curatedCount += 1;
    } else if (m.source === "wikidata") {
      wikidataCount += 1;
    } else {
      nsiCount += 1;
    }
  }

  const distinctCategories = new Set(merchants.map((m) => m.category));

  // Write global gzipped JSONL (backward compatible)
  const { gzippedBytes, rawBytes } = await writeArtifact(
    OUTPUT_PATH,
    merchants
  );

  // Sign the global dictionary artifact
  const PRIVATE_KEY_PATH = path.resolve(
    import.meta.dirname,
    "../data/dictionary.key"
  );
  try {
    if (existsSync(PRIVATE_KEY_PATH)) {
      const privateKey = readFileSync(PRIVATE_KEY_PATH, "utf-8");
      const artifactBytes = readFileSync(OUTPUT_PATH);
      const sig = sign(null, artifactBytes, privateKey);
      const sigPath = `${OUTPUT_PATH}.sig`;
      writeFileSync(sigPath, sig);
      console.log(`Dictionary signed: ${sigPath} (${sig.length} bytes)`);
    } else {
      console.log("No signing key found — dictionary is unsigned.");
    }
  } catch (error) {
    console.warn(
      "Signing failed:",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Write per-country partitions
  const partitions = partitionByCountry(merchants);
  console.log(`\nCountry partitions: ${partitions.size}`);
  for (const [cc, entries] of partitions) {
    const countryPath = path.resolve(
      import.meta.dirname,
      `../data/merchants-${cc}.jsonl.gz`
    );
    await writeArtifact(countryPath, entries);
    console.log(`  ${cc}: ${entries.length} merchants`);
  }

  console.log("\n─── Build Summary ───");
  console.log(`NSI version:        ${NSI_VERSION}`);
  console.log(`Items scanned:      ${scannedCount}`);
  console.log(`Raw NSI candidates: ${rawMerchants.length}`);
  console.log(`NSI kept:           ${nsiCount}`);
  console.log(`Wikidata matched:   ${wikidataMatched}`);
  console.log(`Wikidata new:       ${wikidataNew} (${wikidataCount} total)`);
  console.log(`Curated:            ${curatedCount}`);
  console.log(`Total merchants:    ${merchants.length}`);
  console.log(`Aliases kept:       ${totalAliases}`);
  console.log(`Distinct categories: ${distinctCategories.size}`);
  console.log(`Raw JSONL bytes:    ${rawBytes.toLocaleString()}`);
  console.log(`Gzipped bytes:      ${gzippedBytes.toLocaleString()}`);
  console.log(`Output:             ${OUTPUT_PATH}`);
};

const run = async (): Promise<void> => {
  try {
    await main();
  } catch (error) {
    const isTransient =
      error instanceof TypeError ||
      (error instanceof Error &&
        (error.message.includes("fetch") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("AbortError") ||
          error.message.includes("network")));

    if (isTransient) {
      const exists = await access(OUTPUT_PATH)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        console.warn(
          `⚠ Merchant dictionary build failed (transient) — keeping existing merchants.jsonl.gz. Error: ${error instanceof Error ? error.message : error}`
        );
        return;
      }
    }
    console.error("Build failed:", error);
    process.exit(1);
  }
};

run();

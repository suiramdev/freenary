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

import { mergeCountryScopes } from "../src/categorisation/merchant-scope";
import { normaliseDescriptor } from "../src/categorisation/normalise/normalise-descriptor";
import { resolveNsiCountries } from "../src/categorisation/nsi/location-scope";
import { mapNafToCategory } from "../src/categorisation/sirene/naf-categories";
import { mapOsmTagToCategory } from "./lib/category-map";
import { categoryPriority } from "./lib/category-priority";
import { CURATED_MERCHANTS } from "./lib/curated-merchants";
import { fetchSireneBatch } from "./lib/sirene-client";
import type { SireneSearchResponse } from "./lib/sirene-client";
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
 * Wall-clock ceiling for the SIRENE pass. The job's own limit is 60 minutes and
 * every other pass needs about 7, so this leaves the release steps room even
 * when the endpoint is slow. Whatever it does answer is cached on disk, so a
 * truncated pass resumes rather than restarts.
 */
const SIRENE_BUDGET_MS = 15 * 60 * 1000;

/** A one-word name matches half the registry, so it is not worth a query. */
const MIN_SIRENE_QUERY_LENGTH = 3;

const SIRENE_PROGRESS_EVERY = 50;

// NSI types (minimal, for extraction)

/**
 * NSI geographic scope. `include` mixes ISO codes, UN M49 codes, region
 * filenames and inline GeoJSON geometry, so a member is only a country when
 * `resolveNsiCountries` can validate it as one.
 */
interface NsiLocationSet {
  include?: unknown[];
}

interface NsiItem {
  id?: string;
  displayName?: string;
  locationSet?: NsiLocationSet;
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
    try {
      await rm(tmpDir, { force: true, recursive: true });
    } catch {
      // Best-effort cleanup: a leftover temp dir must not mask the real result.
    }
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
        countries: resolveNsiCountries(item.locationSet?.include),
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

/** Takes a non-empty group so the primary needs no unchecked index access. */
const mergeCollisionGroup = (
  group: [DictionaryMerchant, ...DictionaryMerchant[]]
) => {
  let winningCategory = group[0].category;
  let bestPriority = -1;
  for (const m of group) {
    const p = m.category ? categoryPriority(m.category) : 0;
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
      countries: mergeCountryScopes(group.map((m) => m.countries)),
      domains: mergedDomains,
    },
  };
};

// Wikidata intermediate file types

interface WikidataBrand {
  aliases: string[];
  /** ISO 3166-1 alpha-2 from Wikidata P17; absent in artifacts built before it was captured. */
  countries?: string[];
  domains: string[];
  id: string;
  label: string;
  sirene?: {
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
    const existing =
      existingIdx === undefined ? undefined : merchants[existingIdx];
    if (existing) {
      // Enrich existing entry with new aliases and domains
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
      // Only a stated P17 is evidence. An absent one means Wikidata does not
      // know where the brand trades, which must not erase what NSI declared.
      if (wd.countries && wd.countries.length > 0) {
        existing.countries = mergeCountryScopes([
          existing.countries,
          wd.countries,
        ]);
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
        countries: wd.countries ?? [],
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

/**
 * NAF classes that name a legal or asset structure rather than a trade. A brand
 * is matched here by name, not by SIREN, so the hit is routinely the group's
 * property or holding company: NRJ, Thalys and LVMH all resolve to 68.20, which
 * would file a radio station, a railway and a luxury house alike under `rent`.
 * The map keeps reading these codes at face value, which is right for an
 * establishment identified by its own SIREN rather than by a name search.
 */
const STRUCTURAL_NAF_CLASSES = {
  "64.20": true,
  "64.30": true,
  "66.30": true,
  "68.20": true,
  "70.10": true,
} as const satisfies Record<string, true>;

const parseNafCode = (
  data: SireneSearchResponse,
  queryName: string
): string | null => {
  const [firstResult] = data.results;
  if (!firstResult) {
    return null;
  }

  // Name-match guard: the result must overlap with the query.
  const resultName = (firstResult.nom_complet ?? "").toLowerCase().trim();
  const merchantNameLower = queryName.toLowerCase().trim();
  if (
    !resultName.includes(merchantNameLower) &&
    !merchantNameLower.includes(resultName)
  ) {
    return null;
  }

  const nafCode = firstResult.matching_etablissements[0]?.activite_principale;
  if (!nafCode) {
    return null;
  }
  if (Object.hasOwn(STRUCTURAL_NAF_CLASSES, nafCode.slice(0, 5))) {
    return null;
  }
  return nafCode;
};

// Pass 3c: enrich uncategorised merchants via the French SIRENE registry

/**
 * SIRENE only holds French legal entities, so a non-French brand can only match
 * a namesake: querying it returned a French subsidiary's holding or landlord
 * code 21% of the time (Adobe → 68.20B "rent", Samsung → the obsolete 51.4S),
 * which is worse than leaving the category null. Restricting the pass to
 * French-linked names is also what makes it finish: it cuts ~48k lookups, over
 * two hours at the documented 7 req/s, down to about fifteen hundred.
 */
const isFrenchLinked = (merchant: DictionaryMerchant): boolean =>
  merchant.countries.includes("FR") ||
  merchant.domains.some((d) => d.endsWith(".fr"));

const enrichWithSirene = async (
  merchants: DictionaryMerchant[]
): Promise<number> => {
  const candidates = merchants.filter((m) => {
    if (m.name.length < MIN_SIRENE_QUERY_LENGTH) {
      return false;
    }
    if (!isFrenchLinked(m)) {
      return false;
    }
    if (m.category === null) {
      return true;
    }
    // `uncategorised` and `other-shopping` are the weak NSI outcomes worth a
    // second look: both mean "no consumer intent identified".
    if (
      m.source === "nsi" &&
      (m.category === "uncategorised" || m.category === "other-shopping")
    ) {
      return true;
    }
    return false;
  });

  if (candidates.length === 0) {
    return 0;
  }

  console.log(
    `SIRENE: ${candidates.length} French-linked candidates to enrich`
  );

  // Build a name→merchant index so we can apply results back.
  const byName = new Map<string, DictionaryMerchant[]>();
  for (const m of candidates) {
    const existing = byName.get(m.name);
    if (existing) {
      existing.push(m);
    } else {
      byName.set(m.name, [m]);
    }
  }

  const uniqueNames = [...byName.keys()];

  const outcome = await fetchSireneBatch(uniqueNames, parseNafCode, {
    budgetMs: SIRENE_BUDGET_MS,
    onProgress: (done, total) => {
      if (done % SIRENE_PROGRESS_EVERY === 0 || done === total) {
        console.log(`SIRENE: processed ${done}/${total}`);
      }
    },
  });

  let enriched = 0;
  for (const { query, data: nafCode } of outcome.results) {
    if (nafCode === null) {
      continue;
    }
    const category = mapNafToCategory(nafCode);
    // `uncategorised` states no consumer intent, so it is not worth overwriting
    // a null with: the entry stays a candidate for a better source later.
    if (category === null || category === "uncategorised") {
      continue;
    }
    const merchantsForName = byName.get(query);
    if (!merchantsForName) {
      continue;
    }
    for (const m of merchantsForName) {
      m.category = category;
      enriched += 1;
    }
  }

  console.log(
    `SIRENE: ${enriched} merchants enriched (${outcome.cached} from cache, ${outcome.failed} requests failed)`
  );
  if (outcome.stop !== "complete") {
    console.log(
      `SIRENE: stopped early (${outcome.stop}) with ${outcome.skipped} names unqueried — the disk cache carries them into the next run`
    );
  }
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

    // The curated list declares no country and spans both French utilities and
    // global subscriptions, so it stays unscoped rather than assumed French.
    const merchant: DictionaryMerchant = {
      aliases,
      category: curated.category,
      countries: [],
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
    const [primary, ...rest] = group;
    if (!primary) {
      continue;
    }
    if (rest.length === 0) {
      nsiMerchants.push(primary);
      continue;
    }
    const { merged, absorbed } = mergeCollisionGroup([primary, ...rest]);
    nsiMerchants.push(merged);
    mergedCount += absorbed;
  }
  console.log(
    `Collision resolution: merged ${mergedCount} NSI rows (category-priority)`
  );

  // Pass 3b: merge Wikidata brands (aliases + domains only; no category)
  let wikidataBrands: WikidataBrand[] = [];
  let wikidataMatched = 0;
  let wikidataNew = 0;
  try {
    const wikidataJson = await readFile(WIKIDATA_PATH, "utf-8");
    // SAFETY: wikidata-brands.json is our own build artifact with known WikidataBrand[] shape
    wikidataBrands = JSON.parse(wikidataJson) as WikidataBrand[];
    ({ wikidataMatched, wikidataNew } = mergeWikidataBrands(
      nsiMerchants,
      wikidataBrands,
      isGenericToken
    ));
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

  // Every consumer loads the one artifact and filters on `countries` in memory:
  // per-country files would each need the unscoped worldwide tail duplicated.
  const { gzippedBytes, rawBytes } = await writeArtifact(
    OUTPUT_PATH,
    merchants
  );

  // Sign the dictionary artifact
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

  const scopedCount = merchants.filter((m) => m.countries.length > 0).length;

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
  console.log(
    `Country-scoped:     ${scopedCount} (${merchants.length - scopedCount} unscoped)`
  );
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

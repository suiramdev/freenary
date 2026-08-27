/**
 * Generates place-tokens.ts from GeoNames cities15000 data.
 *
 * Downloads the GeoNames cities15000 dataset (CC-BY), accent-folds each city
 * name using the same normalisation as `normaliseDescriptor`, and writes a
 * sorted token set. Country-name tokens and the French commune prefixes
 * "saint"/"sainte" are included as static entries.
 *
 * Token extraction rules:
 *  - Single-word city names (≥ 4 chars) are included directly.
 *  - For compound names (e.g. "Aix-en-Provence"), only the first token is
 *    included when it is ≥ 4 chars, not a Saint/Sainte prefix, and not in
 *    the exclusion list.
 *  - Tokens that collide with known merchant or brand names are excluded.
 *
 * Population thresholds:
 *  - France (FR): ≥ 20 000 — covers cities that appear in French bank card
 *    descriptors, including smaller préfectures.
 *  - Other European countries: ≥ 200 000 — capitals and major cities only.
 *
 * Usage: bun packages/api/scripts/generate-place-tokens.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEONAMES_URL =
  "https://download.geonames.org/export/dump/cities15000.zip";
const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../src/categorisation/place-tokens.ts",
);

const MIN_TOKEN_LENGTH = 4;

const POP_THRESHOLDS: Record<string, number> = {
  FR: 20_000,
};
const DEFAULT_POP_THRESHOLD = 200_000;

const INCLUDED_COUNTRIES = new Set([
  "AT", "BE", "CH", "CZ", "DE", "DK", "ES", "FI", "FR", "GB", "GR",
  "HR", "HU", "IE", "IT", "LU", "NL", "NO", "PL", "PT", "RO", "SE",
]);

/**
 * Country-name tokens (accent-folded, lowercase).
 */
const COUNTRY_NAME_TOKENS = [
  "allemagne", "austria", "belgique", "croatia", "danmark", "deutschland",
  "espana", "finland", "france", "greece", "hungary", "ireland", "italia",
  "luxembourg", "nederland", "norge", "osterreich", "polska", "portugal",
  "romania", "schweiz", "suisse", "sverige",
];

/** Prefix tokens from compound commune names (Saint-Denis, Sainte-Maxime). */
const FIXED_PREFIX_TOKENS = ["saint", "sainte"];

/**
 * Alternate native-language city names that GeoNames stores in column 1 using
 * only the local spelling. These are included directly as tokens so that
 * descriptors containing e.g. "BRUXELLES" or "MUNCHEN" are matched.
 */
const ALTERNATE_CITY_NAMES = [
  "aix",         // Aix-en-Provence, first token (3 chars, below auto threshold)
  "antwerpen",   // Antwerp in Dutch
  "bruxelles",   // Brussels in French
  "dunkerque",   // Dunkirk in French
  "geneve",      // Geneva in French (folds from Genève)
  "kobenhavn",   // Copenhagen in Danish (folds from København)
  "lisboa",      // Lisbon in Portuguese
  "mans",        // Le Mans, second token of compound name
  "milano",      // Milan in Italian
  "munchen",     // Munich in German (folds from München)
  "napoli",      // Naples in Italian
  "pau",         // Pau, 3 chars (below auto threshold)
  "praha",       // Prague in Czech
  "roma",        // Rome in Italian
  "torino",      // Turin in Italian
  "warszawa",    // Warsaw in Polish
  "wien",        // Vienna in German
];

/**
 * Tokens excluded from auto-generation. Three categories:
 *  1. Generic geographic / administrative terms
 *  2. Person-name fragments from Saint-* / Sainte-* communes
 *  3. Known merchant or brand name collisions
 */
const EXCLUSIONS = new Set([
  // Generic geographic / administrative terms
  "arrondissement", "bains", "barre", "berg", "bois", "burg", "campo",
  "cote", "dorf", "east", "eure", "field", "fort", "gare", "glen",
  "grand", "hall", "haut", "heim", "hill", "isle", "king", "klein",
  "lake", "land", "loir", "mare", "mill", "mine", "mons", "moor",
  "moss", "neuf", "neue", "nord", "oise", "park", "petit", "pine",
  "plage", "pont", "port", "rive", "rose", "seine", "stein", "tree",
  "vert", "wald", "west", "wood", "ville",
  // Person-name fragments from Saint-* / Sainte-* communes
  "aignan", "amand", "ambroise", "andre", "anne", "aubin", "avertin",
  "barthelemy", "benoit", "brieuc", "charles", "cloud", "denis",
  "dizier", "etienne", "florentin", "flour", "gaudens", "genis",
  "georges", "germain", "gervais", "gilles", "herblain", "hilaire",
  "jacques", "jean", "joseph", "julien", "just", "laurent", "louis",
  "malo", "mande", "marcel", "martin", "maur", "medard", "michel",
  "nazaire", "nicolas", "omer", "ouen", "paul", "pierre", "priest",
  "quentin", "raphael",
  // Merchant / brand name collisions
  "apple", "avon", "canal", "gap", "metro", "orange", "shell", "total",
  "uber",
  // English city-name fragments that read as common words
  "archway", "barking", "bath", "camp", "city", "cork", "dame", "dieu",
  "eden", "hopital",
]);

// ---------------------------------------------------------------------------
// Accent folding — mirrors normalise-descriptor.ts
// ---------------------------------------------------------------------------

const COMBINING_MARKS = /[\u0300-\u036F]/gu;
const APOSTROPHES = /['\u2019\u02BC`]/gu;
const NON_ALPHANUMERIC = /[^a-z0-9]+/gu;
const CONTAINS_DIGIT = /[0-9]/u;

const foldToTokens = (name: string): string[] => {
  const folded = name
    .replaceAll("œ", "oe")
    .replaceAll("Œ", "oe")
    .replaceAll("æ", "ae")
    .replaceAll("Æ", "ae")
    .replaceAll("ł", "l")
    .replaceAll("Ł", "l")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(NON_ALPHANUMERIC, " ");

  const tokens: string[] = [];
  for (const token of folded.split(" ")) {
    if (token.length === 0) continue;
    if (CONTAINS_DIGIT.test(token)) continue;
    tokens.push(token);
  }
  return tokens;
};

// ---------------------------------------------------------------------------
// GeoNames parser
// ---------------------------------------------------------------------------

/**
 * cities15000.txt columns (tab-separated):
 *   0: geonameid, 1: name, 8: country code, 14: population
 */
const parseCities = (tsv: string): Set<string> => {
  const tokens = new Set<string>();
  let included = 0;
  let skippedCountry = 0;
  let skippedPop = 0;

  for (const line of tsv.split("\n")) {
    if (line.length === 0 || line.startsWith("#")) continue;

    const cols = line.split("\t");
    const countryCode = cols[8] ?? "";
    if (!INCLUDED_COUNTRIES.has(countryCode)) {
      skippedCountry++;
      continue;
    }

    const population = Number.parseInt(cols[14] ?? "0", 10);
    const threshold = POP_THRESHOLDS[countryCode] ?? DEFAULT_POP_THRESHOLD;
    if (population < threshold) {
      skippedPop++;
      continue;
    }

    const name = cols[1] ?? "";
    const folded = foldToTokens(name);
    included++;

    if (folded.length === 1) {
      // Single-word city: include if long enough and not excluded
      const token = folded[0]!;
      if (token.length >= MIN_TOKEN_LENGTH && !EXCLUSIONS.has(token)) {
        tokens.add(token);
      }
    } else if (folded.length > 1) {
      // Compound city: include first token if distinctive
      const first = folded[0]!;
      if (
        first.length >= MIN_TOKEN_LENGTH &&
        first !== "saint" &&
        first !== "sainte" &&
        !EXCLUSIONS.has(first)
      ) {
        tokens.add(first);
      }
    }
  }

  console.log(
    `  GeoNames: ${included} cities, ${skippedCountry} outside country set, ${skippedPop} below threshold`,
  );
  return tokens;
};

// ---------------------------------------------------------------------------
// Download + extract
// ---------------------------------------------------------------------------

const downloadAndExtract = async (): Promise<string> => {
  console.log(`Downloading ${GEONAMES_URL}...`);
  const response = await fetch(GEONAMES_URL);
  if (!response.ok) {
    throw new Error(`GeoNames download failed: ${response.status}`);
  }

  const zipPath = path.join(tmpdir(), "cities15000.zip");
  await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));

  const extractDir = path.join(tmpdir(), "geonames-extract");
  const proc = Bun.spawnSync(["unzip", "-o", zipPath, "-d", extractDir]);
  if (proc.exitCode !== 0) {
    throw new Error(`unzip failed: ${proc.stderr.toString()}`);
  }

  return readFile(path.join(extractDir, "cities15000.txt"), "utf-8");
};

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

const generateTypeScript = (tokens: string[]): string => {
  const entries = tokens.map((t) => `  ${t}: true,`).join("\n");
  return `/**
 * Place-name tokens that carry location, not merchant identity.
 *
 * Card descriptors routinely append the acceptor's city ("MONOPRIX PARIS 15"),
 * which creates two distinct failure modes this list defends against:
 *
 *  1. A dictionary entry whose whole name is a place ("París", a Spanish department
 *     store) is unique in the canon, so its IDF is maximal and it would *pass* the
 *     specificity gate on a shared city token.
 *  2. A city token shared between descriptor and candidate must never be the
 *     evidence that satisfies the gate.
 *
 * Tokens are stored already normalised (see \`normaliseDescriptor\`): accent-folded,
 * lowercase, single words. Multi-word places are matched token-wise by the consumer.
 *
 * ---
 * Generated by scripts/generate-place-tokens.ts from GeoNames cities15000 (CC-BY 4.0).
 * Do not edit by hand — re-run the generator instead.
 */
const PLACE_TOKENS = {
${entries}
} as const satisfies Record<string, true>;

/** True when a normalised token names a place rather than a merchant. */
export const isPlaceToken = (token: string): boolean =>
  // SAFETY: token is an arbitrary string; the assertion only narrows for the const lookup
  PLACE_TOKENS[token as keyof typeof PLACE_TOKENS] === true;

/**
 * True when every token of a normalised name is a place token, so the name
 * carries no merchant identity at all.
 */
export const isEntirelyPlaceName = (normalisedName: string): boolean => {
  const tokens = normalisedName.split(" ").filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every(isPlaceToken);
};
`;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async (): Promise<void> => {
  const tsv = await downloadAndExtract();
  const geoTokens = parseCities(tsv);

  for (const token of COUNTRY_NAME_TOKENS) {
    geoTokens.add(token);
  }
  for (const token of FIXED_PREFIX_TOKENS) {
    geoTokens.add(token);
  }
  for (const token of ALTERNATE_CITY_NAMES) {
    geoTokens.add(token);
  }

  const sorted = [...geoTokens].sort();
  console.log(`  Total unique tokens: ${sorted.length}`);

  const code = generateTypeScript(sorted);
  await writeFile(OUTPUT_PATH, code, "utf-8");
  console.log(`  Written to ${OUTPUT_PATH}`);
};

main().catch((error: unknown) => {
  console.error("Fatal:", error);
  process.exit(1);
});

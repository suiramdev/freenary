/**
 * Downloads the GeoNames cities15000 dataset and generates a JSON file of
 * normalised place-name tokens for European cities.
 *
 * The resulting `data/place-tokens.json` is a sorted JSON array of unique,
 * lowercase, accent-folded, purely alphabetic tokens (≥ 3 characters) drawn
 * from city names and their alternate names.
 *
 * Graceful degradation: when the download fails and an existing
 * place-tokens.json file is present, the script logs a warning and exits
 * successfully, leaving the existing artifact intact.
 *
 * Usage: bun packages/api/scripts/generate-place-tokens.ts
 */

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { unzipSync } from "fflate";

import { normaliseDescriptor } from "../src/categorisation/normalise/normalise-descriptor";

const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../data/place-tokens.json"
);

const GEONAMES_URL =
  "https://download.geonames.org/export/dump/cities15000.zip";

const EUROPEAN_COUNTRIES = {
  AT: true,
  BE: true,
  BG: true,
  CH: true,
  CY: true,
  CZ: true,
  DE: true,
  DK: true,
  EE: true,
  ES: true,
  FI: true,
  FR: true,
  GB: true,
  GR: true,
  HR: true,
  HU: true,
  IE: true,
  IT: true,
  LT: true,
  LU: true,
  LV: true,
  MT: true,
  NL: true,
  NO: true,
  PL: true,
  PT: true,
  RO: true,
  SE: true,
  SI: true,
  SK: true,
} as const satisfies Record<string, true>;

const ALPHA_ONLY = /^[a-z]+$/u;

/**
 * Downloads the zip and extracts cities15000.txt in memory.
 */
const downloadAndExtract = async (url: string): Promise<string> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const entries = unzipSync(buffer);
  const entry = entries["cities15000.txt"];

  if (!entry) {
    throw new Error("cities15000.txt not found in zip archive");
  }

  return new TextDecoder().decode(entry);
};

/**
 * Parses the GeoNames tab-separated data and collects normalised place tokens
 * for European cities.
 */
const collectPlaceTokens = (tsvContent: string): string[] => {
  const tokens = new Set<string>();

  for (const line of tsvContent.split("\n")) {
    if (line === "") {
      continue;
    }

    const columns = line.split("\t");
    const countryCode = columns[8] ?? "";

    if (
      EUROPEAN_COUNTRIES[countryCode as keyof typeof EUROPEAN_COUNTRIES] !==
      true
    ) {
      continue;
    }

    const name = columns[1] ?? "";
    const alternateNames = columns[3] ?? "";

    /* Collect all raw names: the primary name plus every alternate. */
    const rawNames = [name];
    if (alternateNames !== "") {
      for (const alt of alternateNames.split(",")) {
        rawNames.push(alt);
      }
    }

    for (const rawName of rawNames) {
      const normalised = normaliseDescriptor(rawName);

      if (normalised === "") {
        continue;
      }

      /* Split multi-word normalised names into individual tokens. */
      for (const token of normalised.split(" ")) {
        if (token.length >= 3 && ALPHA_ONLY.test(token)) {
          tokens.add(token);
        }
      }
    }
  }

  return [...tokens].sort();
};

const main = async (): Promise<void> => {
  console.log("Downloading GeoNames cities15000 dataset…");

  try {
    const tsvContent = await downloadAndExtract(GEONAMES_URL);
    console.log(`Extracted ${tsvContent.split("\n").length} lines`);

    const tokens = collectPlaceTokens(tsvContent);

    await writeFile(OUTPUT_PATH, JSON.stringify(tokens, null, 2));
    console.log(`Generated ${tokens.length} place tokens → ${OUTPUT_PATH}`);
  } catch (error: unknown) {
    if (existsSync(OUTPUT_PATH)) {
      console.warn(
        "Download/extraction failed but existing place-tokens.json found — keeping it."
      );
      console.warn(error instanceof Error ? error.message : String(error));
      return;
    }
    throw error;
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

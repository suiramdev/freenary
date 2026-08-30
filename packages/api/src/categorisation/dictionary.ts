import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import { SPENDING_CATEGORIES } from "../lib/mcc-categories";
import type { SpendingCategory } from "../lib/mcc-categories";
import type { DictionaryEntry } from "./types";
import { isVerificationConfigured, verifySignature } from "./verify";

// Static dictionary loaded from gzipped JSONL

interface DictionaryMerchant {
  id: string;
  name: string;
  normalisedName: string;
  category: string | null;
  domains: string[];
  source: string;
  aliases: { alias: string; normalisedAlias: string }[];
}

const VALID_CATEGORIES = new Set<string>(SPENDING_CATEGORIES);

const isSpendingCategory = (value: string): value is SpendingCategory =>
  VALID_CATEGORIES.has(value);

const DATA_DIR = path.resolve(import.meta.dirname, "../../../data");
const DATA_PATH = path.resolve(DATA_DIR, "merchants.jsonl.gz");

const countryDataPath = (country: string): string =>
  path.resolve(DATA_DIR, `merchants-${country.toUpperCase()}.jsonl.gz`);

let dictionary: Map<string, DictionaryEntry> | null = null;
let loadingPromise: Promise<void> | null = null;
let refCount = 0;

const buildDictionaryFromFile = async (
  filePath: string,
  target: Map<string, DictionaryEntry>
): Promise<Map<string, DictionaryEntry>> => {
  if (!existsSync(filePath)) {
    console.warn(
      `[categorisation] Dictionary file not found: ${filePath} — skipping`
    );
    return target;
  }

  if (isVerificationConfigured()) {
    const sigPath = `${filePath}.sig`;
    if (!existsSync(sigPath)) {
      console.warn(
        `[categorisation] Dictionary signature missing: ${filePath} — refusing to load`
      );
      return target;
    }
    const content = readFileSync(filePath);
    const sig = readFileSync(sigPath);
    if (!verifySignature(content, sig)) {
      console.warn(
        `[categorisation] Dictionary signature invalid: ${filePath} — refusing to load`
      );
      return target;
    }
  }

  const gunzip = createGunzip();
  const stream = createReadStream(filePath).pipe(gunzip);
  const rl = createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: stream,
  });

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    try {
      // SAFETY: each line is a JSON-serialised DictionaryMerchant written by the build script
      const merchant = JSON.parse(line) as DictionaryMerchant;

      if (merchant.category === null || merchant.category === undefined) {
        continue;
      }
      if (!isSpendingCategory(merchant.category)) {
        continue;
      }

      const entry: DictionaryEntry = {
        category: merchant.category,
        name: merchant.name,
      };

      target.set(merchant.normalisedName, entry);

      for (const { normalisedAlias } of merchant.aliases) {
        if (normalisedAlias && !target.has(normalisedAlias)) {
          target.set(normalisedAlias, entry);
        }
      }
    } catch {
      // Malformed line — skip silently, never crash the pipeline
    }
  }

  return target;
};

const ensureLoaded = async (): Promise<void> => {
  if (dictionary) {
    return;
  }

  if (!loadingPromise) {
    loadingPromise = (async () => {
      dictionary = await buildDictionaryFromFile(DATA_PATH, new Map());
      loadingPromise = null;
    })();
  }

  await loadingPromise;
};

// Existing shard paths, yielded lazily in the caller's country order.
const existingShardPaths = async function* existingShardPaths(
  countries: string[]
): AsyncGenerator<string, void, void> {
  for (const country of countries) {
    const filePath = countryDataPath(country);
    if (existsSync(filePath)) {
      yield filePath;
    }
  }
};

const ensureLoadedForCountries = async (countries: string[]): Promise<void> => {
  if (dictionary) {
    return;
  }

  const map = new Map<string, DictionaryEntry>();
  let anyCountryFileFound = false;

  // Shards must merge one at a time: aliases are first-wins, so concurrent merges
  // into the shared map would let stream interleaving decide the winner.
  for await (const filePath of existingShardPaths(countries)) {
    await buildDictionaryFromFile(filePath, map);
    anyCountryFileFound = true;
  }

  // Fall back to global file if no country-specific files were found
  if (!anyCountryFileFound) {
    await buildDictionaryFromFile(DATA_PATH, map);
  }

  dictionary = map;
};

/** Eagerly load the dictionary into memory. Call once at batch start. */
export const loadDictionary = async (countries?: string[]): Promise<void> => {
  refCount += 1;
  if (refCount > 1 && dictionary) {
    return;
  }
  try {
    await (countries && countries.length > 0
      ? ensureLoadedForCountries(countries)
      : ensureLoaded());
  } catch {
    // Never throw — treat as empty dictionary
    dictionary = new Map();
    loadingPromise = null;
  }
};

/** Look up a merchant key in the dictionary. Returns the entry or null. */
export const lookupDictionary = async (
  merchantKey: string
): Promise<DictionaryEntry | null> => {
  try {
    await ensureLoaded();
    return dictionary?.get(merchantKey) ?? null;
  } catch {
    // Never throw — miss is acceptable
    return null;
  }
};

/** Release the dictionary from memory. Call after batch completes. */
export const unloadDictionary = (): void => {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    dictionary = null;
    loadingPromise = null;
  }
};

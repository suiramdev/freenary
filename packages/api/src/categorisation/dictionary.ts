import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import { resolveCategorySlug } from "../lib/taxonomy";
import { isInCountryScope } from "./merchant-scope";
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
  /** Absent in artifacts built before geographic scope was captured. */
  countries?: string[];
}

// `src/categorisation` -> the package's own `data/`, where the build script writes.
const DATA_DIR = path.resolve(import.meta.dirname, "../../data");
const DATA_PATH = path.resolve(DATA_DIR, "merchants.jsonl.gz");

let dictionary: Map<string, DictionaryEntry> | null = null;
/** Countries the loaded map was filtered to; `null` means unfiltered. */
let loadedScope: Set<string> | null = null;
let loadingPromise: Promise<void> | null = null;
let refCount = 0;

/**
 * Whether the map already in memory answers for every country in `wanted`.
 * Batches share one module-global map, so a narrower load must never satisfy a
 * wider caller: two concurrent batches in different countries would otherwise
 * silently inherit whichever filter loaded first.
 */
const loadedScopeCovers = (wanted: Set<string> | null): boolean => {
  if (loadedScope === null) {
    return true;
  }
  if (wanted === null) {
    return false;
  }
  for (const country of wanted) {
    if (!loadedScope.has(country)) {
      return false;
    }
  }
  return true;
};

const buildDictionaryFromFile = async (
  filePath: string,
  target: Map<string, DictionaryEntry>,
  wanted: Set<string> | null
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
      if (!isInCountryScope(merchant.countries, wanted)) {
        continue;
      }
      // A dictionary artifact built before the hierarchy still spells its
      // categories the old way, so decode instead of rejecting the entry.
      const category = resolveCategorySlug(merchant.category);
      if (category === null) {
        continue;
      }

      const entry: DictionaryEntry = {
        category,
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

/**
 * Loads, or widens, the shared map until it covers `wanted`. Widening only ever
 * adds entries, so a batch already reading the previous map stays correct.
 */
const ensureLoaded = async (wanted: Set<string> | null): Promise<void> => {
  if (dictionary && loadedScopeCovers(wanted)) {
    return;
  }

  // Queue behind any in-flight load rather than racing it: that load may be
  // narrower than this caller needs, so re-test once it settles and only then
  // decide whether to widen. Published before being awaited so a concurrent
  // caller queues behind this one in turn.
  const inFlight = loadingPromise;
  loadingPromise = (async () => {
    if (inFlight) {
      try {
        await inFlight;
      } catch {
        // A failed load must not cascade to the next caller.
      }
    }

    if (dictionary && loadedScopeCovers(wanted)) {
      return;
    }

    // Either nothing is loaded yet (`loadedScope` still null) or the loaded
    // scope is too narrow, so widen over whatever it holds.
    const target =
      wanted === null ? null : new Set([...(loadedScope ?? []), ...wanted]);
    dictionary = await buildDictionaryFromFile(DATA_PATH, new Map(), target);
    loadedScope = target;
  })();

  await loadingPromise;
};

/**
 * Eagerly load the dictionary into memory. Call once at batch start. Passing
 * countries keeps only merchants scoped to them, plus every unscoped worldwide
 * brand; omitting them loads the whole artifact.
 */
export const loadDictionary = async (countries?: string[]): Promise<void> => {
  refCount += 1;
  const wanted =
    countries && countries.length > 0
      ? new Set(countries.map((c) => c.toUpperCase()))
      : null;
  try {
    await ensureLoaded(wanted);
  } catch {
    // Never throw — treat as empty dictionary
    dictionary = new Map();
    loadedScope = null;
    loadingPromise = null;
  }
};

/** Look up a merchant key in the dictionary. Returns the entry or null. */
export const lookupDictionary = async (
  merchantKey: string
): Promise<DictionaryEntry | null> => {
  try {
    if (!dictionary) {
      // Outside a batch there is no country scope, so load everything rather
      // than risk a false miss. Inside one, use the scope the batch loaded.
      await ensureLoaded(null);
    }
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
    loadedScope = null;
    loadingPromise = null;
  }
};

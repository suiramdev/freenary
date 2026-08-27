/**
 * Streams the committed merchant dictionary artifact, yielding one
 * DictionaryMerchant per JSONL line. Gunzips on the fly so the seeder
 * can iterate tens of thousands of rows without holding them all in memory.
 */

import { createReadStream } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import type { DictionaryMerchant } from "./types";

/** Absolute path to the committed gzipped JSONL artifact. */
export const MERCHANT_DICTIONARY_PATH: string = path.resolve(
  import.meta.dirname,
  "../../../data/merchants.jsonl.gz"
);

/**
 * Streams the gzipped JSONL artifact, yielding one merchant per line.
 * @yields {DictionaryMerchant} One parsed merchant per JSONL line.
 */
export const loadMerchantDictionary =
  async function* loadMerchantDictionary(): AsyncGenerator<DictionaryMerchant> {
    const gunzip = createGunzip();
    const fileStream = createReadStream(MERCHANT_DICTIONARY_PATH);
    const rl = createInterface({
      crlfDelay: Number.POSITIVE_INFINITY,
      input: fileStream.pipe(gunzip),
    });

    for await (const line of rl) {
      if (line.length === 0) {
        continue;
      }
      // SAFETY: each line is a JSON-serialised DictionaryMerchant written by the build script
      yield JSON.parse(line) as DictionaryMerchant;
    }
  };

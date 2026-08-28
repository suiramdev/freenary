/**
 * Transaction categorisation pipeline.
 *
 * Stages execute in order; each exits early on a confident hit:
 *   1. Channel short-circuit (ATM, cheque, fee → known category)
 *   2. User override (exact match on merchant key)
 *   3. Shared dictionary (exact match on merchant key)
 *   4. Local model (n-grams + linear classifier — stub)
 *   5. Opt-in cloud tail (stub)
 *   6. MCC fallback
 *   7. Unknown
 *
 * The pipeline runs as a batch job, not on the request path.
 * Steps 1–3 are hash lookups. Steps 4–5 load/unload resources.
 */

import type { SpendingCategory } from "../lib/mcc-categories";
import { MCC_TO_CATEGORY } from "../lib/mcc-categories";
import {
  loadDictionary,
  lookupDictionary,
  unloadDictionary,
} from "./dictionary";
import { loadModel, predict, unloadModel } from "./model";
import type { CategoriseInput, ResolutionResult } from "./types";
import { lookupUserOverride } from "./user-override";

const CHANNEL_CATEGORY = {
  atm: "transfers",
  cheque: "other",
  fee: "other",
} as const satisfies Record<string, SpendingCategory>;

const UNKNOWN_RESULT: ResolutionResult = {
  band: "unknown",
  category: null,
  confidence: 0,
  intermediaryName: null,
  merchantName: null,
  stage: "none",
};

/** Derive a category from an MCC code; returns null when unknown. */
const categoryFromMcc = (mcc: string): SpendingCategory | null => {
  const n = Math.trunc(Number(mcc));
  if (!Number.isNaN(n) && n >= 3000 && n <= 3999) {
    return "travel";
  }
  // SAFETY: mcc is a string key from the provider; the assertion narrows for the const lookup
  return (
    (MCC_TO_CATEGORY[mcc as keyof typeof MCC_TO_CATEGORY] as
      | SpendingCategory
      | undefined) ?? null
  );
};

const categoriseInternal = async (
  input: CategoriseInput
): Promise<ResolutionResult> => {
  const {
    channel,
    merchantCategoryCode,
    merchantKey,
    normalisedDescriptor,
    userId,
  } = input;

  // Stage 1: Channel short-circuit
  // SAFETY: channel is an arbitrary string; narrowing for the const lookup
  const channelCategory =
    CHANNEL_CATEGORY[channel as keyof typeof CHANNEL_CATEGORY];
  if (channelCategory) {
    return {
      band: "auto",
      category: channelCategory,
      confidence: 0.9,
      intermediaryName: null,
      merchantName: null,
      stage: "channel",
    };
  }

  if (merchantKey.length === 0) {
    return UNKNOWN_RESULT;
  }

  // Stage 2: User override (exact match on merchant key)
  const override = await lookupUserOverride(userId, merchantKey);
  if (override) {
    return {
      band: "auto",
      category: override.category,
      confidence: 1,
      intermediaryName: null,
      merchantName: override.merchantName,
      stage: "user-override",
    };
  }

  // Stage 3: Shared dictionary (exact match on merchant key)
  const dictEntry = await lookupDictionary(merchantKey);
  if (dictEntry) {
    return {
      band: "auto",
      category: dictEntry.category,
      confidence: 0.85,
      intermediaryName: null,
      merchantName: dictEntry.name,
      stage: "dictionary",
    };
  }

  // Stage 4: Local model
  const modelResult = await predict(normalisedDescriptor, input.country);
  if (modelResult && modelResult.confidence >= 0.7) {
    return {
      band: modelResult.confidence >= 0.85 ? "auto" : "suggest",
      category: modelResult.category,
      confidence: modelResult.confidence,
      intermediaryName: null,
      merchantName: null,
      stage: "model",
    };
  }

  // Stage 5: Opt-in cloud tail (stub — returns null)
  // Future: send merchantKey to the cloud API for tail inference
  // when input.allowCloudInference is true.

  // Stage 6: MCC fallback
  if (merchantCategoryCode) {
    const mccCategory = categoryFromMcc(merchantCategoryCode);
    if (mccCategory) {
      return {
        band: "suggest",
        category: mccCategory,
        confidence: 0.5,
        intermediaryName: null,
        merchantName: null,
        stage: "mcc",
      };
    }
  }

  // Stage 7: Unknown
  return UNKNOWN_RESULT;
};

/**
 * Categorise a single transaction through the pipeline.
 * Never throws — returns UNKNOWN_RESULT on any error.
 */
export const categoriseTransaction = async (
  input: CategoriseInput
): Promise<ResolutionResult> => {
  try {
    return await categoriseInternal(input);
  } catch {
    return UNKNOWN_RESULT;
  }
};

/**
 * Run the categorisation pipeline over a batch of transactions.
 * Loads resources once, drains the batch, then frees memory.
 *
 * @param transactions - Array of categorisation inputs
 * @returns Array of results in the same order as inputs
 */
export const categoriseBatch = async (
  transactions: CategoriseInput[],
  countries?: string[]
): Promise<ResolutionResult[]> => {
  if (transactions.length === 0) {
    return [];
  }

  // Load resources once for the batch
  await Promise.all([loadDictionary(countries), loadModel()]);

  try {
    const results: ResolutionResult[] = [];
    for (const tx of transactions) {
      // Sequential: each lookup may hit the DB for user overrides
      // eslint-disable-next-line no-await-in-loop
      const result = await categoriseTransaction(tx);
      results.push(result);
    }
    return results;
  } finally {
    // Free batch resources regardless of success/failure
    unloadDictionary();
    unloadModel();
  }
};

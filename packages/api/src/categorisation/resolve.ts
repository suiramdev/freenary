/**
 * Transaction categorisation pipeline.
 *
 * Stages execute in order; each exits early on a confident hit:
 *   1. Channel short-circuit (ATM, cheque, fee → known category)
 *   2. User override (exact match on merchant key)
 *   3. Shared dictionary (exact match on merchant key)
 *   4. Deterministic layer (MCC, then this country's rules)
 *   5. Local classifier (n-grams + linear model, country as a feature — stub)
 *   6. Opt-in cloud tail (stub)
 *   7. Unknown
 *
 * Stages 1–4 are deterministic: same transaction data, same category, no
 * model involved. The classifier only sees what they leave undecided, and an
 * unconfident classifier yields "uncategorised" rather than a forced guess.
 *
 * The pipeline runs as a batch job, not on the request path.
 * Steps 1–4 are hash lookups and regex tables. Steps 5–6 load/unload resources.
 */

import type { SpendingCategory } from "../lib/taxonomy";
import { deterministicCategory } from "./deterministic";
import {
  loadDictionary,
  lookupDictionary,
  unloadDictionary,
} from "./dictionary";
import {
  loadModel,
  MODEL_ACCEPT_THRESHOLD,
  predict,
  unloadModel,
} from "./model";
import type { CategoriseInput, ResolutionResult } from "./types";
import { lookupUserOverride } from "./user-override";

const CHANNEL_CATEGORY = {
  atm: "cash-withdrawal",
  cheque: "uncategorised",
  fee: "bank-fees",
} as const satisfies Record<string, SpendingCategory>;

const UNKNOWN_RESULT: ResolutionResult = {
  band: "unknown",
  category: null,
  confidence: 0,
  intermediaryName: null,
  merchantName: null,
  stage: "none",
};

const categoriseInternal = async (
  input: CategoriseInput
): Promise<ResolutionResult> => {
  const { channel, merchantKey, normalisedDescriptor, userId } = input;

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

  // Stages 2–3 key off the merchant key; the deterministic layer and the
  // classifier do not, so an unkeyed transaction still gets a chance.
  if (merchantKey.length > 0) {
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
  }

  // Stage 4: Deterministic layer (MCC, then this country's rules)
  const deterministic = deterministicCategory(input);
  if (deterministic) {
    return {
      band: "auto",
      category: deterministic.category,
      confidence: deterministic.confidence,
      intermediaryName: null,
      merchantName: null,
      stage: deterministic.stage,
    };
  }

  // Stage 5: Local classifier — the fallback for what the rules could not decide
  const modelResult = await predict(normalisedDescriptor, input.country);
  if (modelResult && modelResult.confidence >= MODEL_ACCEPT_THRESHOLD) {
    return {
      band: modelResult.confidence >= 0.85 ? "auto" : "suggest",
      category: modelResult.category,
      confidence: modelResult.confidence,
      intermediaryName: null,
      merchantName: null,
      stage: "model",
    };
  }

  // Stage 6: Opt-in cloud tail (stub — returns null)
  // Future: send merchantKey to the cloud API for tail inference
  // when input.allowCloudInference is true.

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

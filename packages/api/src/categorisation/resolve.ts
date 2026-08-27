/**
 * Transaction categorisation cascade.
 *
 * Precedence: channel → memo → intermediary → dictionary → learned → sirene → MCC → unknown.
 * Never throws for any input.
 */

import type { SpendingCategory } from "../lib/mcc-categories";
import { MCC_TO_CATEGORY } from "../lib/mcc-categories";
import { findMerchantCandidates } from "./candidates";
import { detectIntermediary } from "./intermediaries/detect";
import { findLearnedMatch } from "./learned";
import { lookupMemo, recordMemoHit } from "./memo";
import { normaliseDescriptor } from "./normalise/normalise-descriptor";
import { isEntirelyPlaceName } from "./place-tokens";
import { lookupSirene } from "./sirene/lookup";
import type {
  MerchantCandidate,
  ResolveRequest,
  ResolutionResult,
} from "./types";

// ---------------------------------------------------------------------------
// Channel → category mapping for short-circuit channels
// ---------------------------------------------------------------------------

const CHANNEL_CATEGORY = {
  atm: "transfers",
  cheque: "other",
  fee: "other",
} as const satisfies Record<string, SpendingCategory>;

// ---------------------------------------------------------------------------
// Pure gate decision, exported for unit testing without a database
// ---------------------------------------------------------------------------

/**
 * Classify a dictionary candidate into a resolution band and confidence.
 *
 * IDF is a gate, not a reranker — it rejects generic-noun collisions
 * (e.g. "pharmacie centre" → 1.0 swsim but idfPeak 3.4).
 */
export const classifyCandidate = (candidate: MerchantCandidate) => {
  const { idfPeak, strictWordSimilarity } = candidate;

  if (strictWordSimilarity >= 0.6 && idfPeak >= 5) {
    return {
      band: "auto" as const,
      confidence: Math.min(0.99, 0.6 + 0.4 * strictWordSimilarity),
    };
  }

  if (strictWordSimilarity >= 0.45) {
    return {
      band: "suggest" as const,
      confidence: 0.3 + 0.3 * strictWordSimilarity,
    };
  }

  return { band: "unknown" as const, confidence: 0 };
};

// ---------------------------------------------------------------------------
// Full cascade
// ---------------------------------------------------------------------------

const UNKNOWN_RESULT: ResolutionResult = {
  band: "unknown",
  candidates: [],
  category: null,
  confidence: 0,
  intermediaryId: null,
  intermediaryName: null,
  merchantId: null,
  merchantName: null,
  stage: "none",
};

/** Derive a category from an MCC code; returns null when unknown. */
const categoryFromMcc = (mcc: string): SpendingCategory | null => {
  const n = Math.trunc(Number(mcc));
  if (!Number.isNaN(n) && n >= 3000 && n <= 3999) {
    return "travel";
  }
  // SAFETY: mcc is a provider string; the assertion narrows for const lookup
  const mapped = MCC_TO_CATEGORY[mcc as keyof typeof MCC_TO_CATEGORY];
  return mapped ?? null;
};

/** Find the best non-place-name candidate from the dictionary results. */
const findBestCandidate = (
  candidates: MerchantCandidate[]
): MerchantCandidate | null => {
  for (const candidate of candidates) {
    if (!isEntirelyPlaceName(normaliseDescriptor(candidate.merchantName))) {
      return candidate;
    }
  }
  return null;
};

interface StageContext {
  intermediaryId: string | null;
  intermediaryName: string | null;
}

/** Stage 4: dictionary trigram match. */
const resolveDictionary = async (
  text: string,
  ctx: StageContext
): Promise<ResolutionResult | null> => {
  if (text.length <= 1) {
    return null;
  }
  const candidates = await findMerchantCandidates(text, 200);
  if (candidates.length === 0) {
    return null;
  }
  const best = findBestCandidate(candidates);
  if (!best) {
    return null;
  }
  const { band, confidence } = classifyCandidate(best);
  if (band === "unknown") {
    return null;
  }
  return {
    band,
    candidates: candidates.slice(0, 5),
    category: band === "auto" ? best.category : null,
    confidence,
    intermediaryId: ctx.intermediaryId,
    intermediaryName: ctx.intermediaryName,
    merchantId: band === "auto" ? best.merchantId : null,
    merchantName: band === "auto" ? best.merchantName : null,
    stage: "dictionary",
  };
};

/** Stage 5: fuzzy match against previously corrected descriptors. */
const resolveLearned = async (
  userId: string,
  normalisedDescriptor: string,
  ctx: StageContext
): Promise<ResolutionResult | null> => {
  if (normalisedDescriptor.length <= 1) {
    return null;
  }
  try {
    const learned = await findLearnedMatch(userId, normalisedDescriptor);
    if (!learned) {
      return null;
    }
    const band = learned.confidence >= 0.7 ? "auto" : "suggest";
    return {
      band,
      candidates: [],
      category: learned.category,
      confidence: learned.confidence,
      intermediaryId: ctx.intermediaryId,
      intermediaryName: ctx.intermediaryName,
      merchantId: band === "auto" ? learned.merchantId : null,
      merchantName: band === "auto" ? learned.merchantName : null,
      stage: "learned",
    };
  } catch {
    return null;
  }
};

/** Stage 6: NAF-derived category from the French company register. */
const resolveSirene = async (
  normalisedDescriptor: string,
  ctx: StageContext,
  allowExternalLookup: boolean
): Promise<ResolutionResult | null> => {
  if (normalisedDescriptor.length <= 1) {
    return null;
  }
  try {
    const sirene = await lookupSirene(
      normalisedDescriptor,
      allowExternalLookup
    );
    if (!sirene) {
      return null;
    }
    return {
      band: "suggest",
      candidates: [],
      category: sirene.category,
      confidence: 0.45,
      intermediaryId: ctx.intermediaryId,
      intermediaryName: ctx.intermediaryName,
      merchantId: null,
      merchantName: sirene.tradeName ?? sirene.denomination,
      stage: "sirene",
    };
  } catch {
    return null;
  }
};

const resolveInternal = async (
  request: ResolveRequest
): Promise<ResolutionResult> => {
  const {
    allowExternalLookup = false,
    channel,
    creditorIban,
    creditorIdentifications,
    merchantCategoryCode,
    normalisedDescriptor,
    rawDescriptor,
    userId,
  } = request;

  // -------------------------------------------------------------------
  // 1. Channel short-circuit
  // -------------------------------------------------------------------
  // SAFETY: channel is an arbitrary string; the assertion narrows for the const lookup
  const channelCategory =
    CHANNEL_CATEGORY[channel as keyof typeof CHANNEL_CATEGORY];
  if (channelCategory) {
    return {
      band: "auto",
      candidates: [],
      category: channelCategory,
      confidence: 0.9,
      intermediaryId: null,
      intermediaryName: null,
      merchantId: null,
      merchantName: null,
      stage: "channel",
    };
  }

  // -------------------------------------------------------------------
  // 2. Memo
  // -------------------------------------------------------------------
  if (normalisedDescriptor.length > 0) {
    const memo = await lookupMemo(userId, normalisedDescriptor);
    if (memo) {
      // Hit counter failure must not break resolution
      try {
        await recordMemoHit(memo.memoId);
      } catch {
        // Swallowed: counter is non-critical
      }
      return {
        band: "auto",
        candidates: [],
        category: memo.category,
        confidence: memo.isUserScoped ? 1 : 0.95,
        intermediaryId: memo.intermediaryId,
        intermediaryName: null,
        merchantId: memo.merchantId,
        merchantName: memo.merchantName,
        stage: "memo",
      };
    }
  }

  // -------------------------------------------------------------------
  // 3. Intermediary detection
  // -------------------------------------------------------------------
  let intermediaryId: string | null = null;
  let intermediaryName: string | null = null;
  let dictionaryText = normalisedDescriptor;

  const intermediary = detectIntermediary({
    creditorIban,
    creditorIdentifications,
    normalisedDescriptor,
    rawDescriptor,
  });

  if (intermediary) {
    ({ intermediaryId, intermediaryName } = intermediary);

    if (intermediary.normalisedSubmerchant.length > 0) {
      // Run dictionary lookup against the sub-merchant text
      dictionaryText = intermediary.normalisedSubmerchant;
    } else {
      // No sub-merchant: intermediary-only result, never resolve the merchant
      return {
        band: "suggest",
        candidates: [],
        category: null,
        confidence: 0.4,
        intermediaryId,
        intermediaryName,
        merchantId: null,
        merchantName: null,
        stage: "intermediary",
      };
    }
  }

  // -------------------------------------------------------------------
  // 4. Dictionary (trigram)
  // -------------------------------------------------------------------
  const ctx: StageContext = { intermediaryId, intermediaryName };
  const dictResult = await resolveDictionary(dictionaryText, ctx);
  if (dictResult) {
    return dictResult;
  }

  // -------------------------------------------------------------------
  // 5. Learned — fuzzy match against previously corrected descriptors
  // -------------------------------------------------------------------
  const learnedResult = await resolveLearned(userId, normalisedDescriptor, ctx);
  if (learnedResult) {
    return learnedResult;
  }

  // -------------------------------------------------------------------
  // 6. Sirene — NAF-derived category from the French company register
  // -------------------------------------------------------------------
  const sireneResult = await resolveSirene(
    normalisedDescriptor,
    ctx,
    allowExternalLookup
  );
  if (sireneResult) {
    return sireneResult;
  }

  // -------------------------------------------------------------------
  // 7. MCC — category only, never merchant
  // -------------------------------------------------------------------
  if (merchantCategoryCode) {
    const mccCategory = categoryFromMcc(merchantCategoryCode);
    if (mccCategory) {
      return {
        band: "suggest",
        candidates: [],
        category: mccCategory,
        confidence: 0.5,
        intermediaryId,
        intermediaryName,
        merchantId: null,
        merchantName: null,
        stage: "mcc",
      };
    }
  }

  // -------------------------------------------------------------------
  // 8. Unknown
  // -------------------------------------------------------------------
  return {
    band: "unknown",
    candidates: [],
    category: null,
    confidence: 0,
    intermediaryId,
    intermediaryName,
    merchantId: null,
    merchantName: null,
    stage: "none",
  };
};

export const resolveTransaction = async (
  request: ResolveRequest
): Promise<ResolutionResult> => {
  try {
    return await resolveInternal(request);
  } catch {
    // Absolute safety net — resolution must never break transaction sync
    return UNKNOWN_RESULT;
  }
};

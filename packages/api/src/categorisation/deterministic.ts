/**
 * Deterministic categorisation layer — the stage that runs before the
 * classifier.
 *
 * Everything here is a lookup over banking data the transaction already
 * carries: the ISO 18245 merchant category code, then the curated keyword
 * tables for the transaction's country. The same transaction data always
 * yields the same category, so the classifier only ever sees what these
 * rules leave undecided.
 */

import { categoryFromMcc } from "../lib/mcc-categories";
import { CATEGORY_GROUP_OF } from "../lib/taxonomy";
import type { SpendingCategory } from "../lib/taxonomy";
import { keywordsFor, matchKeyword } from "./keywords";
import type { CategoriseInput, ResolutionStage } from "./types";

/** The card network assigned the code to the merchant; it is not parsed text. */
const MCC_CONFIDENCE = 0.8;
/** A curated country rule firing, one step below an exact merchant match. */
const RULE_CONFIDENCE = 0.75;

export interface DeterministicResult {
  category: SpendingCategory;
  confidence: number;
  stage: ResolutionStage;
}

/**
 * Categorise from merchant category code and country rules.
 * Returns null when no rule matches with sufficient confidence — the caller
 * then falls through to the classifier.
 */
export const deterministicCategory = (
  input: CategoriseInput
): DeterministicResult | null => {
  const {
    amountMinor,
    bankTransactionCode,
    counterpartyName,
    country,
    merchantCategoryCode,
    normalisedDescriptor,
  } = input;

  // A code on a credit marks a refund from that merchant, which belongs in the
  // merchant's own category so the period nets out — no direction check here.
  const byMcc = merchantCategoryCode
    ? categoryFromMcc(merchantCategoryCode)
    : null;
  if (byMcc) {
    return { category: byMcc, confidence: MCC_CONFIDENCE, stage: "mcc" };
  }

  const tables = keywordsFor(country);
  const bankCode = bankTransactionCode?.toLowerCase();
  const payee = counterpartyName?.toLowerCase();
  const descriptor = normalisedDescriptor?.toLowerCase();

  // The counterparty name is the cleaner signal, so it is read first; the
  // descriptor still gets a turn when the bank reports no counterparty or the
  // name matches nothing.
  const candidate =
    (bankCode ? matchKeyword(tables.bankCode, bankCode) : null) ??
    (payee ? matchKeyword(tables.counterparty, payee) : null) ??
    (descriptor ? matchKeyword(tables.counterparty, descriptor) : null);

  if (!candidate) {
    return null;
  }

  // An expense keyword on a credit describes a refund, not that spending
  // category. Only an income match survives the direction check.
  if (amountMinor > 0 && CATEGORY_GROUP_OF[candidate] !== "income") {
    return null;
  }

  return { category: candidate, confidence: RULE_CONFIDENCE, stage: "rules" };
};

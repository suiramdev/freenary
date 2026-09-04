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
 * A rule hit that survives the direction check. An expense keyword on a credit
 * describes a refund, not that spending category — and it must not veto the
 * next source either: a salary credit whose bank code reads "transfer" is a
 * salary, not an unresolvable transfer.
 */
const accept = (
  category: SpendingCategory | null,
  amountMinor: number
): DeterministicResult | null => {
  if (!category) {
    return null;
  }
  if (amountMinor > 0 && CATEGORY_GROUP_OF[category] !== "income") {
    return null;
  }
  return { category, confidence: RULE_CONFIDENCE, stage: "rules" };
};

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
  // name matches nothing. The bank-code table goes last against the
  // descriptor: "VIREMENT SALAIRE" carries the same rent/salary/tax wording in
  // its label as another bank sends in its transaction code.
  return (
    (bankCode
      ? accept(matchKeyword(tables.bankCode, bankCode), amountMinor)
      : null) ??
    (payee
      ? accept(matchKeyword(tables.counterparty, payee), amountMinor)
      : null) ??
    (descriptor
      ? accept(matchKeyword(tables.counterparty, descriptor), amountMinor)
      : null) ??
    (descriptor
      ? accept(matchKeyword(tables.bankCode, descriptor), amountMinor)
      : null)
  );
};

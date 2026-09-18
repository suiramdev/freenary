import { categoryFromMcc } from "../lib/mcc-categories";
import { CATEGORY_GROUP_OF } from "../lib/taxonomy";
import type { SpendingCategory } from "../lib/taxonomy";
import type { KeywordTables } from "./keywords";
import { keywordsFor, matchKeyword } from "./keywords";
import type {
  CategoriseInput,
  OutgoingNegativeMinorUnits,
  ResolutionStage,
} from "./types";

export interface DeterministicResult {
  category: SpendingCategory;
  confidence: number;
  stage: ResolutionStage;
}

const MCC_CONFIDENCE = 0.8;
const RULE_CONFIDENCE = 0.75;

const readsAsRefund = (
  category: SpendingCategory,
  amountMinor: OutgoingNegativeMinorUnits
): boolean => amountMinor > 0 && CATEGORY_GROUP_OF[category] !== "income";

const acceptInDirection = (
  category: SpendingCategory | null,
  amountMinor: OutgoingNegativeMinorUnits
): DeterministicResult | null => {
  if (!category) {
    return null;
  }

  if (readsAsRefund(category, amountMinor)) {
    return null;
  }

  return { category, confidence: RULE_CONFIDENCE, stage: "rules" };
};

const ruleHit = (
  table: KeywordTables["bankCode"],
  text: string | undefined,
  amountMinor: OutgoingNegativeMinorUnits
): DeterministicResult | null =>
  text ? acceptInDirection(matchKeyword(table, text), amountMinor) : null;

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

  return (
    ruleHit(tables.bankCode, bankCode, amountMinor) ??
    ruleHit(tables.counterparty, payee, amountMinor) ??
    ruleHit(tables.counterparty, descriptor, amountMinor) ??
    ruleHit(tables.bankCode, descriptor, amountMinor)
  );
};

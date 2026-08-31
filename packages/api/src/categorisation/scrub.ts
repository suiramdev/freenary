import type { SpendingCategory } from "../lib/taxonomy";
import type { TransactionPath } from "./types";

export interface ScrubbedPayload {
  /** Normalised descriptor (merchant identity only, no dates/amounts/account info). */
  normalisedDescriptor: string;
  /** Amount bucket: "micro" (<10€), "small" (<50€), "medium" (<200€), "large" (≥200€). */
  amountBucket: "micro" | "small" | "medium" | "large";
  /** ISO 4217 currency. */
  currency: string;
  /** ISO 3166-1 alpha-2 country of the institution. */
  country: string;
  /** ISO 18245 MCC when available. */
  merchantCategoryCode: string | null;
  /** Transaction path. */
  transactionType: TransactionPath;
  /** The category label assigned (by user or pipeline). */
  category: SpendingCategory;
}

export interface ScrubInput {
  normalisedDescriptor: string;
  amountMinor: number;
  currency: string;
  country: string | null;
  merchantCategoryCode: string | null;
  transactionPath: TransactionPath;
  category: SpendingCategory;
}

const amountBucket = (amountMinor: number): ScrubbedPayload["amountBucket"] => {
  const abs = Math.abs(amountMinor);
  if (abs < 1000) {
    return "micro";
  }
  if (abs < 5000) {
    return "small";
  }
  if (abs < 20_000) {
    return "medium";
  }
  return "large";
};

/**
 * Scrub a transaction to the strict allow-list before cloud submission.
 * Returns null when required fields are missing (the transaction should not be submitted).
 */
export const scrubForContribution = (
  input: ScrubInput
): ScrubbedPayload | null => {
  if (!input.normalisedDescriptor || !input.country) {
    return null;
  }

  return {
    amountBucket: amountBucket(input.amountMinor),
    category: input.category,
    country: input.country,
    currency: input.currency,
    merchantCategoryCode: input.merchantCategoryCode,
    normalisedDescriptor: input.normalisedDescriptor,
    transactionType: input.transactionPath,
  };
};

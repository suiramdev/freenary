import type { SpendingCategory } from "../lib/taxonomy";
import type {
  Iso3166Alpha2Country,
  Iso4217Currency,
  Iso18245MerchantCategoryCode,
  OutgoingNegativeMinorUnits,
  TransactionPath,
} from "./types";

export interface ScrubbedPayload {
  normalisedDescriptor: string;
  amountBucket: "micro" | "small" | "medium" | "large";
  currency: Iso4217Currency;
  country: Iso3166Alpha2Country;
  merchantCategoryCode: Iso18245MerchantCategoryCode | null;
  transactionType: TransactionPath;
  category: SpendingCategory;
}

export interface ScrubInput {
  normalisedDescriptor: string;
  amountMinor: OutgoingNegativeMinorUnits;
  currency: Iso4217Currency;
  country: Iso3166Alpha2Country | null;
  merchantCategoryCode: Iso18245MerchantCategoryCode | null;
  transactionPath: TransactionPath;
  category: SpendingCategory;
}

const SMALL_FROM_MINOR = 1000;
const MEDIUM_FROM_MINOR = 5000;
const LARGE_FROM_MINOR = 20_000;

const amountBucket = (
  amountMinor: OutgoingNegativeMinorUnits
): ScrubbedPayload["amountBucket"] => {
  const abs = Math.abs(amountMinor);

  if (abs < SMALL_FROM_MINOR) {
    return "micro";
  }

  if (abs < MEDIUM_FROM_MINOR) {
    return "small";
  }

  if (abs < LARGE_FROM_MINOR) {
    return "medium";
  }

  return "large";
};

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

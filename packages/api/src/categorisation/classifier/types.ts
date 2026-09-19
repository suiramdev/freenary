import type { SpendingCategory } from "../../lib/taxonomy";
import type { TransactionChannel } from "../normalise/types";
import type {
  Iso3166Alpha2Country,
  Iso4217Currency,
  Iso18245MerchantCategoryCode,
  TransactionPath,
} from "../types";

export type AmountBucket = "micro" | "small" | "medium" | "large";

export type TransactionDirection = "credit" | "debit";

export interface ClassificationInput {
  normalisedDescriptor: string;
  merchantKey: string | null;
  counterpartyName: string | null;
  merchantCategoryCode: Iso18245MerchantCategoryCode | null;
  direction: TransactionDirection;
  amountBucket: AmountBucket;
  currency: Iso4217Currency;
  country: Iso3166Alpha2Country | null;
  channel: TransactionChannel;
  path: TransactionPath;
}

export interface ClassificationPrediction {
  category: SpendingCategory;
  confidence: number;
  answeredBy?: string;
}

export type ClassifierTransport = (
  url: string,
  init: RequestInit
) => Promise<Response>;

export interface TransactionClassifier {
  readonly provider: string;
  readonly model: string;
  classify: (
    input: ClassificationInput
  ) => Promise<ClassificationPrediction | null>;
}

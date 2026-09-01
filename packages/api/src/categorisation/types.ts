import type { SpendingCategory } from "../lib/taxonomy";
import type { TransactionChannel } from "./normalise/types";

/**
 * Transaction path: IBAN-based (direct debits, transfers) or card-based.
 * Determines how the merchant key is derived.
 */
export type TransactionPath = "iban" | "card";

/**
 * Pipeline stage that produced the categorisation result.
 * Stages execute in order; each exits early on a confident hit.
 * Everything up to "rules" is deterministic; "model" and "cloud" are not.
 */
export type ResolutionStage =
  | "channel"
  | "user-override"
  | "dictionary"
  | "mcc"
  | "rules"
  | "model"
  | "cloud"
  | "none";

/**
 * Confidence band for a categorisation result.
 * - auto:    high confidence, displayed without hedging
 * - suggest: moderate confidence, may show a prompt
 * - unknown: no classification; honest "uncategorised"
 */
export type ResolutionBand = "auto" | "suggest" | "unknown";

/** Result of a single transaction categorisation. */
export interface ResolutionResult {
  category: SpendingCategory | null;
  merchantName: string | null;
  intermediaryName: string | null;
  confidence: number;
  band: ResolutionBand;
  stage: ResolutionStage;
}

/** Input to the categorisation pipeline for a single transaction. */
export interface CategoriseInput {
  /** The user who owns this transaction. */
  userId: string;
  /** Derived merchant key: creditor IBAN or normalised label. */
  merchantKey: string;
  /** Normalised descriptor (label path), for model features. */
  normalisedDescriptor: string;
  /** Raw descriptor text for model features. */
  rawDescriptor: string;
  /** Detected payment channel. */
  channel: TransactionChannel;
  /** Transaction path (IBAN or card). */
  path: TransactionPath;
  /** ISO 3166-1 alpha-2 country code of the institution. */
  country?: string | null;
  /** Creditor IBAN when available. */
  creditorIban?: string | null;
  /** Bank's own transaction classification description, when available. */
  bankTransactionCode?: string | null;
  /** Counterparty name when the provider reports one. */
  counterpartyName?: string | null;
  /** ISO 18245 MCC when available. */
  merchantCategoryCode?: string | null;
  /** Signed amount in minor units; negative = outgoing. */
  amountMinor: number;
  /** Whether the user opted into cloud tail inference. */
  allowCloudInference?: boolean;
}

/**
 * Input to the merchant key derivation step.
 * Combines raw transaction data with institution context.
 */
export interface MerchantKeyInput {
  /** Raw remittance lines from the provider. */
  remittanceLines: readonly string[];
  creditorName?: string | null;
  debtorName?: string | null;
  /** Creditor IBAN when available. */
  creditorIban?: string | null;
  /** ISO 20022 bank transaction family code (e.g. "RCDT", "RDDT"). */
  bankTransactionFamilyCode?: string | null;
  /** ISO 20022 bank transaction sub-code. */
  bankTransactionSubCode?: string | null;
  /** Signed minor units; negative = outgoing. */
  amountMinor: number;
  /** Institution display name. */
  institutionName: string;
  institutionBic?: string | null;
  /** Banking group identifier from the provider. */
  institutionGroup?: string | null;
  /** ISO 3166-1 alpha-2 country code. */
  country?: string | null;
  /** Extra creditor identifiers. */
  creditorIdentifications?: readonly { identification: string }[] | null;
}

/** Result of merchant key derivation. */
export interface MerchantKeyResult {
  /** The lookup key: creditor IBAN or normalised label. */
  merchantKey: string;
  /** Which path was taken. */
  path: TransactionPath;
  /** Normalised descriptor for display and model features. */
  normalisedDescriptor: string;
  /** Detected channel. */
  channel: TransactionChannel;
  /** Detected intermediary name, if any. */
  intermediaryName: string | null;
  /** Payee text after parsing (before normalisation). */
  payeeText: string | null;
}

/** A merchant entry in the static dictionary. */
export interface DictionaryEntry {
  name: string;
  category: SpendingCategory;
}

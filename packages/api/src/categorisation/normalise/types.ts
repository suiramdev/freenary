export type TransactionChannel =
  | "card"
  | "transfer"
  | "direct-debit"
  | "atm"
  | "fee"
  | "cheque"
  | "loan"
  | "unknown";

export interface DescriptorParseInput {
  /** Raw remittance lines from the provider; order is NOT guaranteed. */
  remittanceLines: readonly string[];
  creditorName?: string | null;
  debtorName?: string | null;
  /** Institution display name, e.g. "Boursorama". */
  institutionName: string;
  institutionBic?: string | null;
  /** Banking group identifier from the provider (e.g. "Credit Agricole"). */
  institutionGroup?: string | null;
  /** ISO 3166-1 alpha-2 country code of the institution when available. */
  country?: string | null;
  /** ISO 20022 bank transaction family code (e.g. "RCDT", "RDDT"). */
  bankTransactionFamilyCode?: string | null;
  /** ISO 20022 bank transaction sub-code (e.g. "SALA", "DMCT"). */
  bankTransactionSubCode?: string | null;
  /** Signed minor units; negative = outgoing. */
  amountMinor: number;
}

export interface DescriptorParseResult {
  /** Merchant-bearing text after boilerplate removal; null when nothing identifiable remains. */
  payeeText: string | null;
  /** Canonical key: normaliseDescriptor(payeeText). Empty string when payeeText is null. */
  normalisedDescriptor: string;
  channel: TransactionChannel;
  /** Card last four digits when the label carries them. */
  cardLast4?: string;
  /** A date embedded in the LABEL (not the booking date), ISO yyyy-mm-dd when unambiguous. */
  labelDate?: string;
  /** Id of the institution parser that produced this result. */
  parserId: string;
  /** Lines the parser classified as pure bank noise; retained for debugging. */
  droppedLines: string[];
}

export interface InstitutionParser {
  readonly id: string;
  /** True when this parser recognises the institution. */
  matches: (input: DescriptorParseInput) => boolean;
  parse: (input: DescriptorParseInput) => DescriptorParseResult;
}

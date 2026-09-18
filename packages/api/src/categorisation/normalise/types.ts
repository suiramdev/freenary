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
  remittanceLines: readonly string[];
  creditorName?: string | null;
  debtorName?: string | null;
  institutionName: string;
  institutionBic?: string | null;
  institutionGroup?: string | null;
  country?: string | null;
  bankTransactionFamilyCode?: string | null;
  bankTransactionSubCode?: string | null;
  amountMinor: number;
}

export interface DescriptorParseResult {
  payeeText: string | null;
  normalisedDescriptor: string;
  channel: TransactionChannel;
  cardLast4?: string;
  labelDate?: string;
  parserId: string;
  droppedLines: string[];
}

export interface InstitutionParser {
  readonly id: string;
  matches: (input: DescriptorParseInput) => boolean;
  parse: (input: DescriptorParseInput) => DescriptorParseResult;
}

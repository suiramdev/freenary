import type { TransactionChannel } from "../types";

const CARD_PAYMENT_COUNTER_TRANSACTION = "CCRD";
const CARD_PAYMENT_CUSTOMER_TRANSACTION = "MCRD";
const CHARGES_FEES_AND_INTEREST = "CHRG";
const CASH_AT_COUNTER_OR_ATM = "CNTR";
const ISSUED_CREDIT_TRANSFER = "ICDT";
const ISSUED_CHEQUE = "ICHQ";
const ISSUED_DIRECT_DEBIT = "IDDT";
const LOANS_AND_DEPOSITS = "LDAS";
const RECEIVED_CREDIT_TRANSFER = "RCDT";
const RECEIVED_CHEQUE = "RCHQ";
const RECEIVED_DIRECT_DEBIT = "RDDT";

const CHANNEL_BY_FAMILY_CODE = {
  [CARD_PAYMENT_COUNTER_TRANSACTION]: "card",
  [CARD_PAYMENT_CUSTOMER_TRANSACTION]: "card",
  [CASH_AT_COUNTER_OR_ATM]: "atm",
  [CHARGES_FEES_AND_INTEREST]: "fee",
  [ISSUED_CHEQUE]: "cheque",
  [ISSUED_CREDIT_TRANSFER]: "transfer",
  [ISSUED_DIRECT_DEBIT]: "direct-debit",
  [LOANS_AND_DEPOSITS]: "loan",
  [RECEIVED_CHEQUE]: "cheque",
  [RECEIVED_CREDIT_TRANSFER]: "transfer",
  [RECEIVED_DIRECT_DEBIT]: "direct-debit",
} as const satisfies Record<string, TransactionChannel>;

type FamilyCode = keyof typeof CHANNEL_BY_FAMILY_CODE;

const isFamilyCode = (code: string): code is FamilyCode =>
  Object.hasOwn(CHANNEL_BY_FAMILY_CODE, code);

export const channelFromFamilyCode = (
  familyCode: string | null | undefined
): TransactionChannel | undefined => {
  if (!familyCode) {
    return undefined;
  }

  const code = familyCode.toUpperCase();

  return isFamilyCode(code) ? CHANNEL_BY_FAMILY_CODE[code] : undefined;
};

import type { TransactionChannel } from "../types";

/**
 * Map ISO 20022 bank transaction family codes to TransactionChannel.
 *
 * These codes are standardised across all SEPA banks and provided by
 * Enable Banking via `bank_transaction_code.code`. When present they
 * are a more reliable channel signal than regex parsing of remittance text.
 *
 * Reference: ISO 20022 External Code Sets — ExternalBankTransactionFamily.
 */
const FAMILY_CODE_MAP = {
  // Card payments (counter transactions)
  CCRD: "card",
  // Charges, fees and interest
  CHRG: "fee",
  // Cash (ATM, counter withdrawals)
  CNTR: "atm",
  // Issued credit transfers
  ICDT: "transfer",
  // Issued cheques
  ICHQ: "cheque",
  // Issued direct debits
  IDDT: "direct-debit",
  // Loans and deposits
  LDAS: "loan",
  // Card payments (customer transactions)
  MCRD: "card",
  // Received credit transfers
  RCDT: "transfer",
  // Received cheques
  RCHQ: "cheque",
  // Received direct debits
  RDDT: "direct-debit",
} satisfies Record<string, TransactionChannel>;

type FamilyCode = keyof typeof FAMILY_CODE_MAP;

const isFamilyCode = (code: string): code is FamilyCode =>
  Object.hasOwn(FAMILY_CODE_MAP, code);

/**
 * Resolve a TransactionChannel from an ISO 20022 family code.
 * Returns undefined when the code is absent or not mapped.
 */
export const channelFromFamilyCode = (
  familyCode: string | null | undefined
): TransactionChannel | undefined => {
  if (!familyCode) {
    return undefined;
  }
  const code = familyCode.toUpperCase();
  return isFamilyCode(code) ? FAMILY_CODE_MAP[code] : undefined;
};

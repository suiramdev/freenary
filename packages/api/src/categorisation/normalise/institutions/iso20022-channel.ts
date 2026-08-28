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
const FAMILY_CODE_MAP: Readonly<Record<string, TransactionChannel>> = {
  // Received credit transfers
  RCDT: "transfer",
  // Issued credit transfers
  ICDT: "transfer",
  // Received direct debits
  RDDT: "direct-debit",
  // Issued direct debits
  IDDT: "direct-debit",
  // Received cheques
  RCHQ: "cheque",
  // Issued cheques
  ICHQ: "cheque",
  // Card payments (counter transactions)
  CCRD: "card",
  // Card payments (customer transactions)
  MCRD: "card",
  // Cash (ATM, counter withdrawals)
  CNTR: "atm",
  // Charges, fees and interest
  CHRG: "fee",
  // Loans and deposits
  LDAS: "loan",
};

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
  return FAMILY_CODE_MAP[familyCode.toUpperCase()];
};

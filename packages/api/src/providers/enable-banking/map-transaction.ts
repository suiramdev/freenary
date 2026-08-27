import { createHash } from "node:crypto";

import type {
  ProviderCreditorIdentification,
  ProviderTransaction,
} from "../types";
import type { EBCreditorIdentification, EBTransaction } from "./client";

/**
 * Parse a decimal amount string to signed minor units (cents) WITHOUT
 * float rounding drift. Splits on `.`, pads/truncates the fraction
 * to exactly 2 digits, then combines into an integer.
 *
 * Sign is applied from the credit/debit indicator, not the string.
 */
export const parseMinorUnits = (
  amountStr: string,
  creditDebitIndicator?: string
): number => {
  const stripped = amountStr.replace(/^-/u, "");
  const [intPart = "0", rawFrac = ""] = stripped.split(".");
  // Pad to 2 or truncate past 2
  const frac = rawFrac.padEnd(2, "0").slice(0, 2);
  const abs = Math.trunc(Number(`${intPart}${frac}`));
  const sign = creditDebitIndicator === "DBIT" ? -1 : 1;
  return abs * sign;
};

const fingerprintCreditorIdentifications = (
  raw: EBCreditorIdentification | EBCreditorIdentification[] | undefined
): string[] => {
  if (!raw) {
    return [];
  }
  const identifications = Array.isArray(raw) ? raw : [raw];
  return identifications
    .map(
      (identification) =>
        `${identification.scheme_name ?? ""}\u001F${identification.identification ?? ""}`
    )
    .toSorted();
};

const deriveFingerprint = (tx: EBTransaction): string => {
  const stableFields = {
    balanceAfterAmount: tx.balance_after_transaction?.amount,
    balanceAfterCurrency: tx.balance_after_transaction?.currency,
    bankTransactionCode: tx.bank_transaction_code?.code,
    bankTransactionDescription: tx.bank_transaction_code?.description,
    bankTransactionSubCode: tx.bank_transaction_code?.sub_code,
    bookingDate: tx.booking_date,
    creditDebitIndicator: tx.credit_debit_indicator,
    creditorAgentBic: tx.creditor_agent?.bic_fi,
    creditorCountry: tx.creditor?.postal_address?.country,
    creditorIban: tx.creditor_account?.iban,
    creditorIdentifications: fingerprintCreditorIdentifications(
      tx.creditor_account_additional_identification
    ),
    creditorName: tx.creditor?.name,
    creditorTown: tx.creditor?.postal_address?.town_name,
    debtorIban: tx.debtor_account?.iban,
    debtorName: tx.debtor?.name,
    exchangeRate: tx.exchange_rate?.exchange_rate,
    merchantCategoryCode: tx.merchant_category_code,
    note: tx.note,
    referenceNumber: tx.reference_number,
    referenceNumberSchema: tx.reference_number_schema,
    remittanceInformation: tx.remittance_information?.toSorted(),
    status: tx.status,
    transactionAmount: tx.transaction_amount?.amount,
    transactionCurrency: tx.transaction_amount?.currency,
    transactionDate: tx.transaction_date,
    valueDate: tx.value_date,
  };
  return createHash("sha256")
    .update(JSON.stringify(stableFields))
    .digest("hex")
    .slice(0, 32);
};

const normaliseCreditorIdentifications = (
  raw: EBCreditorIdentification | EBCreditorIdentification[] | undefined
): ProviderCreditorIdentification[] | undefined => {
  if (!raw) {
    return undefined;
  }
  const arr = Array.isArray(raw) ? raw : [raw];
  const result: ProviderCreditorIdentification[] = [];
  for (const item of arr) {
    if (item.scheme_name && item.identification) {
      result.push({
        identification: item.identification,
        schemeName: item.scheme_name,
      });
    }
  }
  return result.length > 0 ? result : undefined;
};

/** Map an Enable Banking raw transaction to the provider-agnostic model. */
const mapCreditorFields = (tx: EBTransaction) => ({
  creditorAgentBic: tx.creditor_agent?.bic_fi,
  creditorCountry: tx.creditor?.postal_address?.country,
  creditorIban: tx.creditor_account?.iban,
  creditorIdentifications: normaliseCreditorIdentifications(
    tx.creditor_account_additional_identification
  ),
  creditorName: tx.creditor?.name,
  creditorTown: tx.creditor?.postal_address?.town_name,
});

const mapAmountFields = (tx: EBTransaction) => ({
  amountMinor: parseMinorUnits(
    tx.transaction_amount?.amount ?? "0",
    tx.credit_debit_indicator
  ),
  balanceAfterMinor: tx.balance_after_transaction?.amount
    ? parseMinorUnits(tx.balance_after_transaction.amount)
    : undefined,
  currency: tx.transaction_amount?.currency ?? "EUR",
  exchangeRate: tx.exchange_rate?.exchange_rate,
});

const mapEBTransaction = (
  tx: EBTransaction,
  fallbackDate: string,
  providerTransactionId: string
): ProviderTransaction => ({
  ...mapAmountFields(tx),
  ...mapCreditorFields(tx),
  bankTransactionDescription: tx.bank_transaction_code?.description,
  bankTransactionFamilyCode: tx.bank_transaction_code?.code,
  bankTransactionSubCode: tx.bank_transaction_code?.sub_code,
  bookingDate: tx.booking_date ?? fallbackDate,
  debtorIban: tx.debtor_account?.iban,
  debtorName: tx.debtor?.name,
  merchantCategoryCode: tx.merchant_category_code,
  providerTransactionId,
  psuNote: tx.note,
  referenceNumber: tx.reference_number,
  referenceNumberScheme: tx.reference_number_schema,
  remittanceLines: tx.remittance_information ?? [],
  status: tx.status ?? "BOOK",
  transactionDate: tx.transaction_date,
  valueDate: tx.value_date,
});

/** Map a batch so indistinguishable no-reference transactions remain distinct. */
export const mapEBTransactions = (
  transactions: EBTransaction[],
  fallbackDate: string
): ProviderTransaction[] => {
  const fingerprintOccurrences = new Map<string, number>();

  return transactions.map((tx) => {
    if (tx.entry_reference !== undefined) {
      return mapEBTransaction(tx, fallbackDate, tx.entry_reference);
    }

    const fingerprint = deriveFingerprint(tx);
    const occurrence = (fingerprintOccurrences.get(fingerprint) ?? 0) + 1;
    fingerprintOccurrences.set(fingerprint, occurrence);
    return mapEBTransaction(
      tx,
      fallbackDate,
      `derived:${fingerprint}:${occurrence}`
    );
  });
};

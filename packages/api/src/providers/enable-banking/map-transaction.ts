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

/**
 * Build a deterministic dedup key when both entry_reference and
 * transaction_id are absent. Uses sha256 of the core fields.
 */
const deriveDedupKey = (tx: EBTransaction): string => {
  const parts = [
    tx.booking_date ?? "",
    tx.transaction_amount?.amount ?? "",
    tx.transaction_amount?.currency ?? "",
    ...(tx.remittance_information ?? []),
  ];
  const hash = createHash("sha256").update(parts.join("|")).digest("hex");
  return `derived:${hash.slice(0, 32)}`;
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
  creditorAgentBic: tx.creditor?.agent?.bic_fi,
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

/** Map an Enable Banking raw transaction to the provider-agnostic model. */
export const mapEBTransaction = (
  tx: EBTransaction,
  fallbackDate: string
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
  providerTransactionId:
    tx.entry_reference ?? tx.transaction_id ?? deriveDedupKey(tx),
  psuNote: tx.note,
  referenceNumber: tx.reference_number,
  referenceNumberScheme: tx.reference_number_schema,
  remittanceLines: tx.remittance_information ?? [],
  status: tx.status ?? "BOOK",
  transactionDate: tx.transaction_date,
  valueDate: tx.value_date,
});

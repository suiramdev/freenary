import type { ProviderTransaction } from "../types";
import type { PowensTransaction } from "./client";
import { isReported, toMinorUnits } from "./client";

/**
 * ISO 20022 family codes per Powens transaction type, split by direction, so
 * Powens rows reach `channelFromFamilyCode` with the same signal Enable
 * Banking's own codes carry. Powens `order` is a direct debit.
 */
const FAMILY_CODE_BY_TYPE = {
  bank: { issued: "CHRG", received: "CHRG" },
  card: { issued: "CCRD", received: "CCRD" },
  check: { issued: "ICHQ", received: "RCHQ" },
  deferred_card: { issued: "CCRD", received: "CCRD" },
  deposit: { issued: "CNTR", received: "CNTR" },
  fee: { issued: "CHRG", received: "CHRG" },
  loan_repayment: { issued: "LDAS", received: "LDAS" },
  order: { issued: "IDDT", received: "RDDT" },
  payout: { issued: "ICDT", received: "RCDT" },
  summary_card: { issued: "CCRD", received: "CCRD" },
  transfer: { issued: "ICDT", received: "RCDT" },
  withdrawal: { issued: "CNTR", received: "CNTR" },
} satisfies Record<string, { issued: string; received: string }>;

const isCodedType = (type: string): type is keyof typeof FAMILY_CODE_BY_TYPE =>
  Object.hasOwn(FAMILY_CODE_BY_TYPE, type);

interface CounterpartyFields {
  creditorIban?: string;
  creditorName?: string;
  debtorIban?: string;
  debtorName?: string;
}

const mapCounterparty = (
  transaction: PowensTransaction,
  value: number
): CounterpartyFields => {
  const { counterparty } = transaction;
  const label = counterparty?.label;
  if (!(counterparty && label)) {
    return {};
  }

  const iban =
    counterparty.account_scheme_name === "iban"
      ? (counterparty.account_identification ?? undefined)
      : undefined;
  // Powens omits the role on some connectors; the sign says which side we are.
  const role = counterparty.type ?? (value < 0 ? "creditor" : "debtor");
  return role === "creditor"
    ? { creditorIban: iban, creditorName: label }
    : { debtorIban: iban, debtorName: label };
};

const remittanceLines = (transaction: PowensTransaction): string[] => {
  const lines: string[] = [];
  for (const line of [transaction.original_wording, transaction.wording]) {
    if (line && !lines.includes(line)) {
      lines.push(line);
    }
  }
  return lines;
};

/**
 * Null when there is nothing to book: a deleted row, or one missing the amount
 * or the booking date the core stores.
 */
export const mapPowensTransaction = (
  transaction: PowensTransaction,
  currency: string,
  precision: number
): ProviderTransaction | null => {
  const { value, date: bookingDate, type } = transaction;
  if (transaction.deleted || !isReported(value) || !bookingDate) {
    return null;
  }

  const typeName = type ?? "";
  const codes = isCodedType(typeName)
    ? FAMILY_CODE_BY_TYPE[typeName]
    : undefined;
  return {
    ...mapCounterparty(transaction, value),
    amountMinor: toMinorUnits(value, precision),
    bankTransactionDescription: type ?? undefined,
    bankTransactionFamilyCode: value < 0 ? codes?.issued : codes?.received,
    bookingDate,
    currency,
    providerTransactionId: String(transaction.id),
    psuNote: transaction.comment ?? undefined,
    remittanceLines: remittanceLines(transaction),
    status: transaction.coming ? "PDNG" : "BOOK",
    transactionDate: transaction.rdate ?? undefined,
    valueDate: transaction.vdate ?? undefined,
  };
};

export const mapPowensTransactions = (
  transactions: PowensTransaction[],
  currency: string,
  precision: number
): ProviderTransaction[] => {
  const mapped: ProviderTransaction[] = [];
  for (const transaction of transactions) {
    const result = mapPowensTransaction(transaction, currency, precision);
    if (result) {
      mapped.push(result);
    }
  }
  return mapped;
};

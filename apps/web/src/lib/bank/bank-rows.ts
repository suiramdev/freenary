import type {
  BankConnection,
  BankInstitution,
} from "@/hooks/bank/use-bank-connections";
import { m } from "@/paraglide/messages.js";
import type { Locale } from "@/paraglide/runtime.js";

/** One row of the bank list: an institution, a connection, or both. */
export interface BankRow {
  connection: BankConnection | null;
  /** The BIC until the bank is connected, then what the connection holds. */
  description: string | null;
  id: string;
  institution: BankInstitution | null;
  logo: string | null;
  name: string;
}

/** What a connected row says beneath the bank name, most useful fact first. */
const summaryOf = (connection: BankConnection, locale: Locale): string => {
  const accounts = m.bank_account(
    { count: connection.accounts.length },
    { locale }
  );
  if (connection.status !== "ACTIVE") {
    return m.bank_row_reconnect({ accounts }, { locale });
  }
  return connection.lastSyncedAt
    ? m.bank_row_synced(
        { accounts, date: connection.lastSyncedAt.toLocaleDateString(locale) },
        { locale }
      )
    : m.bank_row_never_synced({ accounts }, { locale });
};

/**
 * Connected banks first, so they are there without searching. One row per
 * connection rather than per institution: a connection whose institution the
 * provider no longer lists would otherwise have nowhere to be disconnected.
 */
export const buildBankRows = (
  banks: BankInstitution[],
  connections: BankConnection[],
  locale: Locale
): BankRow[] => {
  const institutionsById = new Map(banks.map((bank) => [bank.id, bank]));
  const connectedIds = new Set(
    connections
      .map((connection) => connection.institutionId)
      .filter((id): id is string => id !== null)
  );

  const connected = connections.map((connection) => {
    const institution = connection.institutionId
      ? (institutionsById.get(connection.institutionId) ?? null)
      : null;
    return {
      connection,
      description: summaryOf(connection, locale),
      id: connection.id,
      institution,
      logo: institution?.logo ?? null,
      name: institution?.name ?? connection.institutionName,
    };
  });

  const available = banks
    .filter((bank) => !connectedIds.has(bank.id))
    .map((bank) => ({
      connection: null,
      description: bank.bic,
      id: bank.id,
      institution: bank,
      logo: bank.logo,
      name: bank.name,
    }));

  return [...connected, ...available];
};

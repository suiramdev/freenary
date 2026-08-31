import type {
  BankConnection,
  BankInstitution,
} from "@/hooks/bank/use-bank-connections";

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
const summaryOf = (connection: BankConnection): string => {
  const accountCount = connection.accounts.length;
  const accounts = `${accountCount} account${accountCount === 1 ? "" : "s"}`;
  if (connection.status !== "ACTIVE") {
    return `${accounts} · Reconnect to resume importing`;
  }
  return connection.lastSyncedAt
    ? `${accounts} · Synced ${connection.lastSyncedAt.toLocaleDateString()}`
    : `${accounts} · Not synced yet`;
};

/**
 * Connected banks first, so they are there without searching. One row per
 * connection rather than per institution: a connection whose institution the
 * provider no longer lists would otherwise have nowhere to be disconnected.
 */
export const buildBankRows = (
  banks: BankInstitution[],
  connections: BankConnection[]
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
      description: summaryOf(connection),
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

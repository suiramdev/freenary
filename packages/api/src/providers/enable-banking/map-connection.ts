import type { CompletedConnection } from "../types";

export interface EBCompletedConnection {
  accounts: {
    account_id?: { iban?: string };
    name?: string;
    uid: string;
  }[];
  aspsp?: { name?: string };
  session_id: string;
}

export const mapEBCompletedConnection = (
  connection: EBCompletedConnection
): CompletedConnection => ({
  accounts: connection.accounts.map((account) => ({
    iban: account.account_id?.iban,
    name: account.name,
    providerAccountId: account.uid,
  })),
  institutionName: connection.aspsp?.name ?? "",
  providerSessionId: connection.session_id,
});

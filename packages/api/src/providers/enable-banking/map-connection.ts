import type { CompletedConnection } from "../types";
import type { EBCompletedConnection } from "./client";

export const mapEBCompletedConnection = (
  connection: EBCompletedConnection
): CompletedConnection => ({
  accounts: connection.accounts.map((account) => ({
    iban: account.account_id?.iban,
    identificationHash: account.account_id?.identification_hash,
    name: account.name,
    providerAccountId: account.uid,
  })),
  institutionGroup: connection.aspsp?.group ?? undefined,
  institutionName: connection.aspsp?.name ?? "",
  providerSessionId: connection.session_id,
});

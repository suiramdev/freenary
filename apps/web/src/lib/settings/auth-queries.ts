import { queryOptions } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages.js";

/** What `/list-sessions` gives the Security group; the client revives the dates. */
export interface UserSession {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  ipAddress?: string | null;
  token: string;
  updatedAt: Date;
  userAgent?: string | null;
}

/** better-auth's provider id for the password account. */
export const CREDENTIAL_PROVIDER_ID = "credential";

/** What `/list-accounts` gives it — `providerId` is `credential` for a password. */
export interface LinkedAccount {
  accountId: string;
  createdAt: Date;
  id: string;
  providerId: string;
  updatedAt: Date;
}

/** Invalidated by every revocation, and by linking or unlinking an account. */
export const AUTH_SESSIONS_QUERY_KEY = ["auth", "sessions"];
export const AUTH_ACCOUNTS_QUERY_KEY = ["auth", "accounts"];

export const authSessionsQueryOptions = () =>
  queryOptions<UserSession[]>({
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error) {
        throw new Error(error.message ?? m.settings_sessions_load_error());
      }
      return data;
    },
    queryKey: AUTH_SESSIONS_QUERY_KEY,
  });

export const authAccountsQueryOptions = () =>
  queryOptions<LinkedAccount[]>({
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) {
        throw new Error(error.message ?? m.settings_accounts_load_error());
      }
      return data;
    },
    queryKey: AUTH_ACCOUNTS_QUERY_KEY,
  });

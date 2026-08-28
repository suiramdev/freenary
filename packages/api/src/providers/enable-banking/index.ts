import type {
  BankingProvider,
  CompletedConnection,
  FetchTransactionsRequest,
  ProviderInstitution,
  ProviderTransaction,
  StartConnectionRequest,
} from "../types";
import { ebFetch, fetchTransactionPages, isConfigured } from "./client";
import type { EBCompletedConnection } from "./map-connection";
import { mapEBCompletedConnection } from "./map-connection";
import { mapEBTransactions } from "./map-transaction";

export const enableBankingProvider: BankingProvider = {
  async completeConnection(code: string): Promise<CompletedConnection> {
    const response = await ebFetch("/sessions", {
      body: JSON.stringify({ code }),
      method: "POST",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Enable Banking session failed: ${response.status} ${text}`
      );
    }

    // SAFETY: Enable Banking POST /sessions returns { session_id, accounts } per their docs
    const data = (await response.json()) as EBCompletedConnection;
    return mapEBCompletedConnection(data);
  },

  async fetchTransactions(
    request: FetchTransactionsRequest
  ): Promise<ProviderTransaction[]> {
    const raw = await fetchTransactionPages(
      request.providerAccountId,
      request.dateFrom,
      request.dateTo
    );
    return mapEBTransactions(raw, request.dateFrom);
  },

  id: "enable-banking",

  isConfigured,

  async listInstitutions(country: string): Promise<ProviderInstitution[]> {
    if (!isConfigured()) {
      return [];
    }

    try {
      const response = await ebFetch(
        `/aspsps?country=${encodeURIComponent(country)}`
      );

      if (!response.ok) {
        return [];
      }

      // SAFETY: Enable Banking API returns { aspsps: [...] } per their docs
      const data = (await response.json()) as {
        aspsps: {
          bic?: string | null;
          country: string;
          group?: string | null;
          logo?: string | null;
          name: string;
        }[];
      };

      return data.aspsps.map((aspsp) => ({
        bic: aspsp.bic ?? undefined,
        country: aspsp.country,
        group: aspsp.group ?? undefined,
        id: aspsp.name,
        logoUrl: aspsp.logo ?? undefined,
        name: aspsp.name,
      }));
    } catch {
      return [];
    }
  },

  async startConnection(
    request: StartConnectionRequest
  ): Promise<{ url: string }> {
    const response = await ebFetch("/auth", {
      body: JSON.stringify({
        access: {
          valid_until: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        aspsp: { country: request.country, name: request.institutionId },
        psu_type: "personal",
        redirect_url: request.redirectUrl,
        state: request.state,
      }),
      method: "POST",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Enable Banking auth failed: ${response.status} ${text}`);
    }

    // SAFETY: Enable Banking POST /auth returns { url: string } per their docs
    const data = (await response.json()) as { url: string };
    return { url: data.url };
  },
};

import type {
  BankingProvider,
  CompleteConnectionRequest,
  CompletedConnection,
  ConnectionRequest,
  FetchHoldingsRequest,
  FetchTransactionsRequest,
  ProviderAccount,
  ProviderHolding,
  ProviderInstitution,
  ProviderTransaction,
  ProviderUserSession,
  StartConnectionRequest,
} from "../types";
import type {
  PowensConnection,
  PowensConnector,
  PowensInvestment,
} from "./client";
import {
  currencyOf,
  fetchTransactionPages,
  getAccount,
  isConfigured,
  powensFetch,
  powensHost,
  precisionOf,
  readJson,
  requireCredentials,
} from "./client";
import { mapPowensAccount } from "./map-account";
import { mapPowensConnection } from "./map-connection";
import { mapPowensInvestments } from "./map-holding";
import { mapPowensTransactions } from "./map-transaction";

const CONNECTION_ID = /^\d+$/u;

/**
 * Connection states only the account holder can clear. Anything else — null,
 * a sync in flight, or a bank-side outage — is transient and left to retry.
 */
const NEEDS_USER_ACTION = {
  SCARequired: true,
  actionNeeded: true,
  additionalInformationNeeded: true,
  decoupled: true,
  passwordExpired: true,
  webauthRequired: true,
  wrongpass: true,
} satisfies Record<string, true>;

const requireUser = (user: ProviderUserSession | null): ProviderUserSession => {
  if (!user) {
    throw new Error("Powens needs a provider user session");
  }
  return user;
};

const getConnection = async (
  user: ProviderUserSession,
  providerSessionId: string,
  expand: string
): Promise<PowensConnection> => {
  const response = await powensFetch(
    `/users/me/connections/${encodeURIComponent(providerSessionId)}?expand=${expand}`,
    { token: user.accessToken }
  );
  return await readJson<PowensConnection>(response, "connection");
};

export const powensProvider: BankingProvider = {
  callbackPath: "/callback/powens",

  async closeConnection(request: ConnectionRequest): Promise<void> {
    const user = requireUser(request.user);
    const response = await powensFetch(
      `/users/me/connections/${encodeURIComponent(request.providerSessionId)}`,
      { method: "DELETE", token: user.accessToken }
    );

    // A connection already gone at Powens is the outcome asked for.
    if (response.ok || response.status === 404) {
      return;
    }

    const text = await response.text();
    throw new Error(
      `Powens connection deletion failed: ${response.status} ${text}`
    );
  },

  async completeConnection(
    request: CompleteConnectionRequest
  ): Promise<CompletedConnection> {
    const user = requireUser(request.user);
    const connectionId = request.callbackParams.connection_id;
    if (!(connectionId && CONNECTION_ID.test(connectionId))) {
      throw new Error("Powens callback is missing the connection id");
    }

    // A connection belonging to another Powens user is a 404 under this token,
    // which is the ownership check.
    const connection = await getConnection(
      user,
      connectionId,
      "accounts,connector"
    );
    return mapPowensConnection(connection);
  },

  async createUser(): Promise<ProviderUserSession> {
    const { clientId, clientSecret } = requireCredentials();
    const response = await powensFetch("/auth/init", {
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
      method: "POST",
    });
    const data = await readJson<{ auth_token: string; id_user: number }>(
      response,
      "user creation"
    );
    return {
      accessToken: data.auth_token,
      providerUserId: String(data.id_user),
    };
  },

  async deleteUser(user: ProviderUserSession): Promise<void> {
    const response = await powensFetch("/users/me", {
      method: "DELETE",
      token: user.accessToken,
    });
    if (response.ok || response.status === 404) {
      return;
    }

    const text = await response.text();
    throw new Error(`Powens user deletion failed: ${response.status} ${text}`);
  },

  async fetchAccounts(request: ConnectionRequest): Promise<ProviderAccount[]> {
    const user = requireUser(request.user);
    const connection = await getConnection(
      user,
      request.providerSessionId,
      "accounts"
    );

    const { state } = connection;
    if (state && Object.hasOwn(NEEDS_USER_ACTION, state)) {
      throw new Error(
        `Powens connection needs the user's attention (${state})`
      );
    }

    return (connection.accounts ?? [])
      .filter((account) => !account.deleted)
      .map(mapPowensAccount);
  },

  async fetchHoldings(
    request: FetchHoldingsRequest
  ): Promise<ProviderHolding[]> {
    const user = requireUser(request.user);
    const account = await getAccount(
      user.accessToken,
      request.providerAccountId
    );
    const response = await powensFetch(
      `/users/me/accounts/${encodeURIComponent(request.providerAccountId)}/investments`,
      { token: user.accessToken }
    );
    const data = await readJson<{ investments?: PowensInvestment[] }>(
      response,
      "investments"
    );
    return mapPowensInvestments(
      data.investments ?? [],
      currencyOf(account) ?? "EUR",
      precisionOf(account)
    );
  },

  async fetchTransactions(
    request: FetchTransactionsRequest
  ): Promise<ProviderTransaction[]> {
    const user = requireUser(request.user);
    const account = await getAccount(
      user.accessToken,
      request.providerAccountId
    );
    // `dateTo` goes unused: Powens returns everything it holds past the cursor,
    // and the upsert is idempotent.
    const raw = await fetchTransactionPages(
      user.accessToken,
      request.providerAccountId,
      `${request.dateFrom} 00:00:00`
    );
    return mapPowensTransactions(
      raw,
      currencyOf(account) ?? "EUR",
      precisionOf(account)
    );
  },

  id: "powens",

  isConfigured,

  async listInstitutions(country: string): Promise<ProviderInstitution[]> {
    if (!isConfigured()) {
      return [];
    }

    try {
      const response = await powensFetch(
        `/connectors?country_codes=${encodeURIComponent(country)}`
      );
      if (!response.ok) {
        return [];
      }

      // SAFETY: Powens GET /connectors returns { connectors: [...] } per their docs
      const data = (await response.json()) as {
        connectors?: PowensConnector[];
      };

      const connectors = (data.connectors ?? []).filter(
        (connector) =>
          !(connector.hidden || connector.restricted) &&
          (connector.products ?? []).some(
            (product) => product === "bank" || product === "wealth"
          )
      );
      return connectors.map((connector) => ({
        country,
        id: connector.uuid,
        name: connector.name ?? connector.uuid,
      }));
    } catch {
      return [];
    }
  },

  async startConnection(
    request: StartConnectionRequest
  ): Promise<{ url: string }> {
    const user = requireUser(request.user);
    const { clientId, domain } = requireCredentials();

    const response = await powensFetch("/auth/token/code?type=singleAccess", {
      token: user.accessToken,
    });
    const data = await readJson<{ code: string }>(response, "webview code");

    // One connector_uuids value skips connector selection; the webview then
    // handles credentials, SCA and which accounts the user activates.
    const params = new URLSearchParams({
      client_id: clientId,
      code: data.code,
      connector_uuids: request.institutionId,
      domain: powensHost(domain),
      redirect_uri: request.redirectUrl,
      state: request.state,
    });
    return { url: `https://webview.powens.com/connect?${params.toString()}` };
  },
};

import { createSign } from "node:crypto";

import { env } from "@freenary/env/server";

export interface Bank {
  bic: string | null;
  country: string;
  logo: string | null;
  name: string;
}

export const isEnableBankingConfigured = (): boolean =>
  !!(env.ENABLE_BANKING_APP_ID && env.ENABLE_BANKING_PRIVATE_KEY);

const base64url = (data: Buffer | string): string => {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buf.toString("base64url");
};

const createJwt = (appId: string, privateKey: string): string => {
  const header = base64url(
    JSON.stringify({ alg: "RS256", kid: appId, typ: "JWT" })
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      aud: "api.enablebanking.com",
      exp: now + 3600,
      iat: now,
      iss: "enablebanking.com",
      sub: appId,
    })
  );

  const signingInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signingInput}.${signature}`;
};

const getCredentials = (): { appId: string; privateKey: string } | null => {
  const appId = env.ENABLE_BANKING_APP_ID;
  const rawKey = env.ENABLE_BANKING_PRIVATE_KEY;
  if (!appId || !rawKey) {
    return null;
  }
  // Env values may contain literal \n sequences instead of real newlines
  const privateKey = rawKey.replaceAll("\\n", "\n");
  return { appId, privateKey };
};

const ebFetch = (path: string, init?: RequestInit): Promise<Response> => {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("Enable Banking is not configured");
  }
  const token = createJwt(creds.appId, creds.privateKey);
  return fetch(`https://api.enablebanking.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
};

export const getAvailableBanks = async (country: string): Promise<Bank[]> => {
  if (!isEnableBankingConfigured()) {
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
        logo?: string | null;
        name: string;
      }[];
    };

    return data.aspsps.map((aspsp) => ({
      bic: aspsp.bic ?? null,
      country: aspsp.country,
      logo: aspsp.logo ?? null,
      name: aspsp.name,
    }));
  } catch {
    return [];
  }
};

/**
 * Start an Enable Banking authorization session.
 * Returns the URL the user must visit to authorize bank access.
 */
export const startBankConnection = async (opts: {
  bankCountry: string;
  bankName: string;
  redirectUrl: string;
  state: string;
}): Promise<{ url: string }> => {
  const response = await ebFetch("/auth", {
    body: JSON.stringify({
      access: {
        valid_until: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      aspsp: { country: opts.bankCountry, name: opts.bankName },
      psu_type: "personal",
      redirect_url: opts.redirectUrl,
      state: opts.state,
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
};

/**
 * Exchange the authorization code for a session with account data.
 */
export const exchangeBankCode = async (
  code: string
): Promise<{
  accounts: { iban?: string; name?: string; uid: string }[];
  sessionId: string;
}> => {
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
  const data = (await response.json()) as {
    accounts: { iban?: string; name?: string; uid: string }[];
    session_id: string;
  };
  return { accounts: data.accounts, sessionId: data.session_id };
};

interface EBTransaction {
  entry_reference?: string;
  transaction_id?: string;
  booking_date?: string;
  transaction_amount?: {
    amount?: string;
    currency?: string;
  };
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
  credit_debit_indicator?: string;
}

/**
 * Fetch transactions for a specific account from Enable Banking.
 *
 * Enable Banking API: `GET /accounts/{account_id}/transactions`
 * The account_id is the UUID returned in POST /sessions (stored as providerAccountId).
 * Authentication is JWT-based via the Authorization header (handled by ebFetch).
 * The session ID is NOT part of the URL — it only gates which accounts are accessible.
 *
 * Handles pagination via `continuation_key`.
 */
export const getTransactions = async (
  _sessionId: string,
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<{
  transactions: {
    transactionId: string;
    date: string;
    amount: number;
    currency: string;
    description: string;
    counterpartyName?: string;
  }[];
}> => {
  const allTransactions: EBTransaction[] = [];
  let continuationKey: string | undefined;

  do {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });
    if (continuationKey) {
      params.set("continuation_key", continuationKey);
    }

    const response = await ebFetch(
      `/accounts/${encodeURIComponent(accountId)}/transactions?${params.toString()}`
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Enable Banking transactions failed: ${response.status} ${text}`
      );
    }


    // SAFETY: Enable Banking GET /accounts/{id}/transactions returns
    // { transactions: EBTransaction[], continuation_key?: string }
    const data = (await response.json()) as {
      transactions?: EBTransaction[];
      continuation_key?: string;
    };

    if (data.transactions) {
      allTransactions.push(...data.transactions);
    }

    continuationKey = data.continuation_key ?? undefined;
  } while (continuationKey);

  return {
    transactions: allTransactions.map((tx) => {
      const abs = Number.parseFloat(tx.transaction_amount?.amount ?? "0");
      // DBIT = money leaving the account (outgoing), CRDT = money entering (incoming)
      const sign = tx.credit_debit_indicator === "DBIT" ? -1 : 1;
      return {
        amount: abs * sign,
        counterpartyName: tx.creditor?.name ?? tx.debtor?.name ?? undefined,
        currency: tx.transaction_amount?.currency ?? "EUR",
        date: tx.booking_date ?? dateFrom,
        description: tx.remittance_information?.join(" ") ?? "",
        transactionId:
          tx.transaction_id ?? tx.entry_reference ?? crypto.randomUUID(),
      };
    }),
  };
};

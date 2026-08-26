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
  value_date?: string;
  transaction_date?: string;
  transaction_amount?: {
    amount?: string;
    currency?: string;
  };
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
  credit_debit_indicator?: string;
  merchant_category_code?: string;
  bank_transaction_code?: {
    description?: string;
    code?: string;
    sub_code?: string;
  };
  status?: string;
  balance_after_transaction?: {
    amount?: string;
    currency?: string;
  };
  creditor_account?: { iban?: string };
  debtor_account?: { iban?: string };
  reference_number?: string;
  exchange_rate?: {
    exchange_rate?: string;
  };
}

const mapTransactionAmount = (tx: EBTransaction) => {
  const abs = Number(tx.transaction_amount?.amount ?? "0");
  // DBIT = money leaving the account (outgoing), CRDT = money entering (incoming)
  const sign = tx.credit_debit_indicator === "DBIT" ? -1 : 1;
  return {
    amount: abs * sign,
    currency: tx.transaction_amount?.currency ?? "EUR",
  };
};

const mapTransactionAccounts = (tx: EBTransaction) => ({
  counterpartyName: tx.creditor?.name ?? tx.debtor?.name ?? undefined,
  creditorAccountIban: tx.creditor_account?.iban ?? undefined,
  debtorAccountIban: tx.debtor_account?.iban ?? undefined,
});

const mapTransactionDates = (tx: EBTransaction, fallbackDate: string) => ({
  date: tx.booking_date ?? fallbackDate,
  transactionDate: tx.transaction_date ?? undefined,
  valueDate: tx.value_date ?? undefined,
});

const mapTransactionMetadata = (tx: EBTransaction) => ({
  bankTransactionCode: tx.bank_transaction_code?.description ?? undefined,
  bankTransactionSubCode: tx.bank_transaction_code?.sub_code ?? undefined,
  description: tx.remittance_information?.join(" ") ?? "",
  exchangeRate: tx.exchange_rate?.exchange_rate ?? undefined,
  merchantCategoryCode: tx.merchant_category_code ?? undefined,
  referenceNumber: tx.reference_number ?? undefined,
  status: tx.status ?? "BOOK",
  transactionId:
    tx.transaction_id ?? tx.entry_reference ?? crypto.randomUUID(),
});

/** Maps an Enable Banking transaction to the normalized application format. */
const mapEBTransaction = (tx: EBTransaction, fallbackDate: string) => ({
  ...mapTransactionAmount(tx),
  ...mapTransactionAccounts(tx),
  ...mapTransactionDates(tx, fallbackDate),
  ...mapTransactionMetadata(tx),
  balanceAfterTransaction: tx.balance_after_transaction?.amount
    ? Math.round(Number(tx.balance_after_transaction.amount) * 100)
    : undefined,
});

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
    merchantCategoryCode?: string;
    bankTransactionCode?: string;
    bankTransactionSubCode?: string;
    status: string;
    valueDate?: string;
    transactionDate?: string;
    balanceAfterTransaction?: number;
    creditorAccountIban?: string;
    debtorAccountIban?: string;
    referenceNumber?: string;
    exchangeRate?: string;
  }[];
}> => {
  const allTransactions: EBTransaction[] = [];
  let continuationKey: string | undefined;

  // eslint-disable-next-line no-await-in-loop -- pagination must be sequential; each page depends on the previous continuation_key
  do {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });
    if (continuationKey) {
      params.set("continuation_key", continuationKey);
    }

    // eslint-disable-next-line no-await-in-loop -- sequential pagination
    const response = await ebFetch(
      `/accounts/${encodeURIComponent(accountId)}/transactions?${params.toString()}`
    );

    if (!response.ok) {
      // eslint-disable-next-line no-await-in-loop -- sequential pagination
      const text = await response.text();
      throw new Error(
        `Enable Banking transactions failed: ${response.status} ${text}`
      );
    }

    // SAFETY: Enable Banking GET /accounts/{id}/transactions returns
    // { transactions: EBTransaction[], continuation_key?: string }
    // eslint-disable-next-line no-await-in-loop -- sequential pagination
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
    transactions: allTransactions.map((tx) => mapEBTransaction(tx, dateFrom)),
  };
};

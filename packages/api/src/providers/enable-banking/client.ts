import { createSign } from "node:crypto";

import { env } from "@freenary/env/server";

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

export const isConfigured = (): boolean =>
  !!(env.ENABLE_BANKING_APP_ID && env.ENABLE_BANKING_PRIVATE_KEY);

/**
 * Authenticated fetch against the Enable Banking API.
 * Creates a fresh JWT for each request (valid for 1 hour).
 */
export const ebFetch = (
  path: string,
  init?: RequestInit
): Promise<Response> => {
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

/** Raw Enable Banking API transaction type. */
export interface EBTransaction {
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
  creditor?: {
    name?: string;
    agent?: { bic_fi?: string };
    postal_address?: {
      town_name?: string;
      country?: string;
    };
  };
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
  creditor_account_additional_identification?:
    | EBCreditorIdentification
    | EBCreditorIdentification[];
  debtor_account?: { iban?: string };
  reference_number?: string;
  reference_number_schema?: string;
  exchange_rate?: {
    exchange_rate?: string;
  };
  note?: string;
}

export interface EBCreditorIdentification {
  scheme_name?: string;
  identification?: string;
}

/**
 * Fetch all transaction pages for one account.
 * Uses `strategy=longest` on the first page for maximum cold-start history.
 */
export const fetchTransactionPages = async (
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<EBTransaction[]> => {
  const all: EBTransaction[] = [];
  let continuationKey: string | undefined;
  let isFirstPage = true;

  do {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });
    if (isFirstPage) {
      params.set("strategy", "longest");
      isFirstPage = false;
    }
    if (continuationKey) {
      params.set("continuation_key", continuationKey);
    }
    // eslint-disable-next-line no-await-in-loop -- pagination is sequential; each page needs the previous continuation_key
    const response = await ebFetch(
      `/accounts/${encodeURIComponent(accountId)}/transactions?${params.toString()}`
    );

    if (!response.ok) {
      // eslint-disable-next-line no-await-in-loop -- sequential pagination error reporting
      const text = await response.text();
      throw new Error(
        `Enable Banking transactions failed: ${response.status} ${text}`
      );
    }

    // SAFETY: Enable Banking GET /accounts/{id}/transactions returns
    // { transactions: EBTransaction[], continuation_key?: string }
    // eslint-disable-next-line no-await-in-loop -- sequential pagination; each page depends on the previous continuation_key
    const data = (await response.json()) as {
      transactions?: EBTransaction[];
      continuation_key?: string;
    };

    if (data.transactions) {
      all.push(...data.transactions);
    }

    continuationKey = data.continuation_key ?? undefined;
  } while (continuationKey);

  return all;
};

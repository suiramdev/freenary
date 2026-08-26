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

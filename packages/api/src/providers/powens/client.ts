import { env } from "@freenary/env/server";

const DOMAIN_SUFFIX = /\.biapi\.pro\/?$/u;
const POWENS_DATETIME =
  /^(?<date>\d{4}-\d{2}-\d{2})[ T](?<time>\d{2}:\d{2}:\d{2})/u;

/** The API host derived from a domain, accepting `acme` and `acme.biapi.pro` alike. */
export const powensHost = (domain: string): string =>
  `${domain.trim().replace(DOMAIN_SUFFIX, "")}.biapi.pro`;

interface PowensCredentials {
  clientId: string;
  clientSecret: string;
  domain: string;
}

const getCredentials = (): PowensCredentials | null => {
  const domain = env.POWENS_DOMAIN;
  const clientId = env.POWENS_CLIENT_ID;
  const clientSecret = env.POWENS_CLIENT_SECRET;
  if (!(domain && clientId && clientSecret)) {
    return null;
  }
  return { clientId, clientSecret, domain };
};

export const isConfigured = (): boolean => getCredentials() !== null;

/** Throws when Powens is unconfigured, so every caller can assume credentials. */
export const requireCredentials = (): PowensCredentials => {
  const credentials = getCredentials();
  if (!credentials) {
    throw new Error("Powens is not configured");
  }
  return credentials;
};

const apiBase = (): string =>
  `https://${powensHost(requireCredentials().domain)}/2.0`;

const powensHeaders = (token?: string): Headers => {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

export interface PowensRequest {
  /** User-scoped bearer token; the auth and connector endpoints take none. */
  token?: string;
  method?: string;
  body?: string;
}

export const powensFetch = (
  path: string,
  request?: PowensRequest
): Promise<Response> =>
  fetch(`${apiBase()}${path}`, {
    body: request?.body,
    headers: powensHeaders(request?.token),
    method: request?.method,
  });

export const readJson = async <T>(
  response: Response,
  what: string
): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Powens ${what} failed: ${response.status} ${text}`);
  }
  // SAFETY: each endpoint's response follows the shape Powens documents for it
  return (await response.json()) as T;
};

export interface PowensConnector {
  id?: number;
  uuid: string;
  name?: string | null;
  hidden?: boolean | null;
  restricted?: boolean | null;
  beta?: boolean | null;
  capabilities?: string[] | null;
  products?: string[] | null;
}

export interface PowensCurrency {
  id?: string | null;
  precision?: number | null;
}

/** Powens documents the account type as `{ name }`; domains send a bare string. */
export type PowensAccountType = string | { name?: string | null };

export interface PowensAccount {
  id: number;
  name?: string | null;
  original_name?: string | null;
  iban?: string | null;
  number?: string | null;
  balance?: number | null;
  coming?: number | null;
  currency?: PowensCurrency | null;
  type?: PowensAccountType | null;
  disabled?: string | boolean | null;
  deleted?: string | null;
  last_update?: string | null;
}

export interface PowensConnection {
  id: number;
  /** null = healthy; anything else names why the connection stopped. */
  state?: string | null;
  connector?: { name?: string | null; uuid?: string | null } | null;
  accounts?: PowensAccount[] | null;
}

export interface PowensCounterparty {
  label?: string | null;
  account_scheme_name?: string | null;
  account_identification?: string | null;
  type?: string | null;
}

export interface PowensTransaction {
  id: number;
  id_account?: number;
  date?: string | null;
  vdate?: string | null;
  rdate?: string | null;
  /** Signed decimal; negative = outgoing. */
  value?: number | null;
  type?: string | null;
  original_wording?: string | null;
  simplified_wording?: string | null;
  wording?: string | null;
  coming?: boolean | null;
  active?: boolean | null;
  deleted?: string | null;
  comment?: string | null;
  counterparty?: PowensCounterparty | null;
  original_currency?: PowensCurrency | null;
}

export interface PowensInvestment {
  id: number;
  id_account?: number;
  label?: string | null;
  code?: string | null;
  code_type?: string | null;
  quantity?: number | null;
  unitprice?: number | null;
  unitvalue?: number | null;
  valuation?: number | null;
  diff?: number | null;
  diff_percent?: number | null;
  vdate?: string | null;
  deleted?: string | null;
  last_update?: string | null;
  original_currency?: PowensCurrency | null;
}

/** Powens reports an unavailable number as null, or by omitting the field. */
export const isReported = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

/** Powens amounts are decimals; the core stores minor units of the account currency. */
export const toMinorUnits = (value: number, precision: number): number =>
  Math.round(value * 10 ** precision);

export const precisionOf = (account: PowensAccount): number =>
  account.currency?.precision ?? 2;

export const currencyOf = (account: PowensAccount): string | undefined =>
  account.currency?.id ?? undefined;

/** Powens datetimes are UTC in `YYYY-MM-DD HH:MM:SS` form. */
export const toIsoDateTime = (
  value: string | null | undefined
): string | undefined => {
  const groups = value?.match(POWENS_DATETIME)?.groups;
  return groups ? `${groups.date}T${groups.time}Z` : undefined;
};

export const getAccount = async (
  token: string,
  accountId: string
): Promise<PowensAccount> => {
  const response = await powensFetch(
    `/users/me/accounts/${encodeURIComponent(accountId)}`,
    { token }
  );
  return await readJson<PowensAccount>(response, "account");
};

interface PowensTransactionPage {
  transactions?: PowensTransaction[] | null;
  _links?: { next?: { href?: string | null } | null } | null;
}

/**
 * Every transaction page for one account. `limit` is mandatory at Powens and
 * caps at 1000; `last_update` is the sync cursor.
 */
export const fetchTransactionPages = async (
  token: string,
  accountId: string,
  lastUpdate: string
): Promise<PowensTransaction[]> => {
  const all: PowensTransaction[] = [];
  let url = `${apiBase()}/users/me/accounts/${encodeURIComponent(accountId)}/transactions?limit=1000&last_update=${encodeURIComponent(lastUpdate)}`;
  let next: string | undefined = url;

  while (next) {
    url = next;
    // eslint-disable-next-line no-await-in-loop -- pagination is sequential; each page needs the previous page's next link
    const response = await fetch(url, { headers: powensHeaders(token) });
    // eslint-disable-next-line no-await-in-loop -- sequential pagination; the next link only exists once this page is read
    const page = await readJson<PowensTransactionPage>(
      response,
      "transactions"
    );
    if (page.transactions) {
      all.push(...page.transactions);
    }
    next = page._links?.next?.href ?? undefined;
  }

  return all;
};

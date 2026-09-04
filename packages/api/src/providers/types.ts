export interface ProviderInstitution {
  id: string;
  name: string;
  country: string;
  logoUrl?: string;
  bic?: string;
  group?: string;
}

export interface ProviderCreditorIdentification {
  schemeName: string;
  identification: string;
}

export interface ProviderTransaction {
  /** Stable dedup key. Never randomly generated. */
  providerTransactionId: string;
  bookingDate: string;
  valueDate?: string;
  transactionDate?: string;
  /** Signed amount in minor units; negative = outgoing. */
  amountMinor: number;
  currency: string;
  /** Raw remittance lines exactly as provided. Order is NOT guaranteed. */
  remittanceLines: string[];
  creditorName?: string;
  debtorName?: string;
  creditorIban?: string;
  debtorIban?: string;
  /** Creditor agent BIC — identifies the acquiring bank, a useful intermediary signal. */
  creditorAgentBic?: string;
  creditorTown?: string;
  creditorCountry?: string;
  creditorIdentifications?: ProviderCreditorIdentification[];
  merchantCategoryCode?: string;
  /** ISO 20022 family code where the provider exposes or derives one. */
  bankTransactionFamilyCode?: string;
  bankTransactionSubCode?: string;
  /** ASPSP-proprietary free-text classification. */
  bankTransactionDescription?: string;
  referenceNumber?: string;
  referenceNumberScheme?: string;
  balanceAfterMinor?: number;
  status: string;
  exchangeRate?: string;
  /** The PSU's own note, where the bank exposes it. */
  psuNote?: string;
}

/** Identity at a provider that scopes data per user (Powens). Persisted by the core, opaque to it. */
export interface ProviderUserSession {
  providerUserId: string;
  accessToken: string;
}

export interface StartConnectionRequest {
  institutionId: string;
  country: string;
  redirectUrl: string;
  state: string;
  user: ProviderUserSession | null;
}

export interface CompleteConnectionRequest {
  /** Every query parameter the provider appended to the callback URL, stringified. */
  callbackParams: Record<string, string>;
  user: ProviderUserSession | null;
}

export interface ConnectionRequest {
  providerSessionId: string;
  user: ProviderUserSession | null;
}

export interface FetchTransactionsRequest extends ConnectionRequest {
  providerAccountId: string;
  /** Sync cursor: the day of the last successful sync, or the history floor on first sync. */
  dateFrom: string;
  dateTo: string;
}

export interface FetchHoldingsRequest extends ConnectionRequest {
  providerAccountId: string;
}

/** Mirrors the Prisma enum `BankAccountType` member names so sync writes them without a mapping. */
export type ProviderAccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CARD"
  | "LOAN"
  | "BROKERAGE"
  | "LIFE_INSURANCE"
  | "RETIREMENT"
  | "EMPLOYEE_SAVINGS"
  | "REAL_ESTATE"
  | "CROWDLENDING"
  | "UNKNOWN";

const INVESTMENT_ACCOUNT_TYPES = {
  BROKERAGE: true,
  CROWDLENDING: true,
  EMPLOYEE_SAVINGS: true,
  LIFE_INSURANCE: true,
  REAL_ESTATE: true,
  RETIREMENT: true,
} satisfies Partial<Record<ProviderAccountType, true>>;

/** True for account types whose contents are holdings rather than cash movements. */
export const isInvestmentAccountType = (type: string): boolean =>
  Object.hasOwn(INVESTMENT_ACCOUNT_TYPES, type);

export interface ProviderAccount {
  providerAccountId: string;
  name?: string;
  iban?: string;
  type: ProviderAccountType;
  currency?: string;
  /** Signed balance in minor units of `currency`; undefined when the provider has none. */
  balanceMinor?: number;
  /** ISO 8601 datetime of the balance. */
  balanceAt?: string;
}

export interface ProviderHolding {
  providerHoldingId: string;
  label: string;
  /** ISIN when `codeType` is "ISIN". */
  code?: string;
  codeType?: "ISIN" | "AMF";
  /** Decimal strings: units can be fractional and must not go through a float. */
  quantity: string;
  unitCost?: string;
  unitValue?: string;
  valuationMinor: number;
  unrealisedGainMinor?: number;
  currency: string;
  /** YYYY-MM-DD valuation date. */
  valuedAt?: string;
}

export interface CompletedConnection {
  providerSessionId: string;
  institutionName: string;
  institutionGroup?: string;
  accounts: {
    providerAccountId: string;
    iban?: string;
    identificationHash?: string;
    name?: string;
  }[];
}

export interface BankingProvider {
  readonly id: string;
  /** Web route the provider redirects back to, appended to CORS_ORIGIN; registered at the provider. */
  readonly callbackPath: `/callback/${string}`;
  isConfigured: () => boolean;
  /** Present only when the provider scopes data per user. The core persists and echoes the session. */
  createUser?: () => Promise<ProviderUserSession>;
  deleteUser?: (user: ProviderUserSession) => Promise<void>;
  listInstitutions: (country: string) => Promise<ProviderInstitution[]>;
  startConnection: (
    request: StartConnectionRequest
  ) => Promise<{ url: string }>;
  completeConnection: (
    request: CompleteConnectionRequest
  ) => Promise<CompletedConnection>;
  /**
   * Deletes the provider session and asks the bank to close its consent.
   * Resolving means the request landed — banks confirm no more than that.
   */
  closeConnection: (request: ConnectionRequest) => Promise<void>;
  fetchTransactions: (
    request: FetchTransactionsRequest
  ) => Promise<ProviderTransaction[]>;
  /** Wealth capability. Absent when the provider exposes neither balances nor holdings. */
  fetchAccounts?: (request: ConnectionRequest) => Promise<ProviderAccount[]>;
  fetchHoldings?: (request: FetchHoldingsRequest) => Promise<ProviderHolding[]>;
}

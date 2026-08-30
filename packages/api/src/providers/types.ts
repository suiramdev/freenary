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
  /** ISO 20022 family code; the domain is not exposed by Enable Banking. */
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

export interface FetchTransactionsRequest {
  providerSessionId: string;
  providerAccountId: string;
  dateFrom: string;
  dateTo: string;
}

export interface StartConnectionRequest {
  institutionId: string;
  country: string;
  redirectUrl: string;
  state: string;
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
  isConfigured: () => boolean;
  listInstitutions: (country: string) => Promise<ProviderInstitution[]>;
  startConnection: (
    request: StartConnectionRequest
  ) => Promise<{ url: string }>;
  completeConnection: (code: string) => Promise<CompletedConnection>;
  /**
   * Revokes the provider session so the bank-side consent stops as well.
   * Resolves when the session is already gone upstream.
   */
  closeConnection: (providerSessionId: string) => Promise<void>;
  fetchTransactions: (
    request: FetchTransactionsRequest
  ) => Promise<ProviderTransaction[]>;
}

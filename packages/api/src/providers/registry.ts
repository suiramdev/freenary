import { enableBankingProvider } from "./enable-banking";
import type { BankingProvider } from "./types";

const providers = {
  [enableBankingProvider.id]: enableBankingProvider,
} as const satisfies Record<string, BankingProvider>;

export const getProvider = (id: string): BankingProvider => {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Unknown banking provider: ${id}`);
  }
  return provider;
};

export const getDefaultProvider = (): BankingProvider => enableBankingProvider;

export const listProviders = (): BankingProvider[] => Object.values(providers);

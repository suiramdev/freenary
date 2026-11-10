import type { ProviderAccountType } from "../providers/types";

export const ASSET_CLASSES = [
  "cash",
  "savings",
  "investments",
  "property",
  "other",
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number];

const ASSET_CLASS_OF = {
  BROKERAGE: "investments",
  CARD: "cash",
  CHECKING: "cash",
  CROWDLENDING: "investments",
  EMPLOYEE_SAVINGS: "investments",
  LIFE_INSURANCE: "investments",
  LOAN: "other",
  REAL_ESTATE: "property",
  RETIREMENT: "investments",
  SAVINGS: "savings",
  UNKNOWN: "other",
} as const satisfies Record<ProviderAccountType, AssetClass>;

export interface ValuedAccount {
  balanceAt: Date | null;
  balanceMinor: number | null;
  currency: string | null;
  type: ProviderAccountType;
}

export interface NetWorth {
  assetClasses: { amountMinor: number; assetClass: AssetClass }[];
  assetsMinor: number;
  balancesAt: Date | null;
  excludedAccountCount: number;
  liabilitiesMinor: number;
  netWorthMinor: number | null;
}

const laterOf = (current: Date | null, candidate: Date | null) => {
  if (candidate === null) {
    return current;
  }

  return current === null || candidate > current ? candidate : current;
};

export const assetClassOf = (type: ProviderAccountType): AssetClass =>
  ASSET_CLASS_OF[type];

export const netWorthOf = (
  accounts: ValuedAccount[],
  currency: string
): NetWorth => {
  const byClass = new Map<AssetClass, number>();
  let assetsMinor = 0;
  let liabilitiesMinor = 0;
  let excludedAccountCount = 0;
  let valuedAccountCount = 0;
  let balancesAt: Date | null = null;

  for (const account of accounts) {
    const { balanceMinor } = account;

    if (balanceMinor === null || account.currency !== currency) {
      excludedAccountCount += 1;

      continue;
    }

    valuedAccountCount += 1;
    balancesAt = laterOf(balancesAt, account.balanceAt);

    if (balanceMinor < 0) {
      liabilitiesMinor += -balanceMinor;

      continue;
    }

    const assetClass = assetClassOf(account.type);
    assetsMinor += balanceMinor;
    byClass.set(assetClass, (byClass.get(assetClass) ?? 0) + balanceMinor);
  }

  return {
    assetClasses: ASSET_CLASSES.flatMap((assetClass) => {
      const amountMinor = byClass.get(assetClass) ?? 0;

      return amountMinor > 0 ? [{ amountMinor, assetClass }] : [];
    }),
    assetsMinor,
    balancesAt,
    excludedAccountCount,
    liabilitiesMinor,
    netWorthMinor:
      valuedAccountCount > 0 ? assetsMinor - liabilitiesMinor : null,
  };
};

export interface ValuedHolding {
  currency: string;
  id: string;
  label: string;
  unrealisedGainMinor: number | null;
  valuationMinor: number;
}

export interface HoldingsSummary {
  costBasisMinor: number | null;
  holdingCount: number;
  topHoldings: Omit<ValuedHolding, "currency">[];
  unrealisedGainMinor: number | null;
  valuationMinor: number;
}

export const TOP_HOLDINGS_SHOWN = 3;

export const holdingsSummaryOf = (
  holdings: ValuedHolding[],
  currency: string
): HoldingsSummary => {
  const inCurrency = holdings.filter(
    (holding) => holding.currency === currency
  );

  let valuationMinor = 0;
  let gainMinor = 0;
  let valuationWithGainMinor = 0;
  let reportsGain = false;

  for (const holding of inCurrency) {
    valuationMinor += holding.valuationMinor;

    if (holding.unrealisedGainMinor !== null) {
      reportsGain = true;
      gainMinor += holding.unrealisedGainMinor;
      valuationWithGainMinor += holding.valuationMinor;
    }
  }

  return {
    costBasisMinor: reportsGain ? valuationWithGainMinor - gainMinor : null,
    holdingCount: inCurrency.length,
    topHoldings: inCurrency
      .toSorted((a, b) => b.valuationMinor - a.valuationMinor)
      .slice(0, TOP_HOLDINGS_SHOWN)
      .map(({ id, label, unrealisedGainMinor, valuationMinor: value }) => ({
        id,
        label,
        unrealisedGainMinor,
        valuationMinor: value,
      })),
    unrealisedGainMinor: reportsGain ? gainMinor : null,
    valuationMinor,
  };
};

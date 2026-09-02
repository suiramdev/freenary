import type { ChartConfig } from "@freenary/ui/components/chart";

import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import type { Locale } from "@/paraglide/runtime.js";

/** Demo figures for the login showcase panel — illustrative, never fetched. */

// Each card prints the last point of the series drawn beneath it, so the two
// are named once here and cannot drift apart.
const monthlySpendingLatest = 3247;
const netWorthLatest = 47_850;

export const monthlySpendingSeries = [
  2100,
  2800,
  2400,
  3100,
  2900,
  3400,
  2700,
  3200,
  2600,
  3000,
  2850,
  monthlySpendingLatest,
];

export const weeklyData = [
  { amount: 45 },
  { amount: 82 },
  { amount: 35 },
  { amount: 120 },
  { amount: 95 },
  { amount: 150 },
  { amount: 60 },
];

/** Colour only: a decorative card has nothing to label, and a translated
 * label would mean calling `m.*()` at module scope. */
export const weeklyConfig: ChartConfig = {
  amount: { color: CHART_COLOR_VARS.green },
};

export const netWorthTrend = [
  32_000,
  33_500,
  34_200,
  35_800,
  37_100,
  38_500,
  36_900,
  39_200,
  41_000,
  43_500,
  45_200,
  netWorthLatest,
];

/** The headlines, as numbers rather than strings, so every locale formats
 * its own. */
export const previewFigures = {
  emergencyFund: 8400,
  emergencyFundTarget: 12_000,
  monthlySpending: monthlySpendingLatest,
  monthlySpendingChange: 0.023,
  netWorth: netWorthLatest,
  netWorthChange: 0.124,
  thisWeek: weeklyData.reduce((total, day) => total + day.amount, 0),
};

/** Euro, like the rest of the app. Whole units — the sibling `formatCurrency`
 * takes minor ones. */
export const formatPreviewAmount = (
  amountMajorUnits: number,
  locale: Locale
): string =>
  new Intl.NumberFormat(locale, {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountMajorUnits);

/** A share of a goal: `0.7` → `70 %`. */
export const formatPreviewRatio = (ratio: number, locale: Locale): string =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(ratio);

/** A movement, always signed: `0.023` → `+2,3 %`. */
export const formatPreviewChange = (ratio: number, locale: Locale): string =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
    style: "percent",
  }).format(ratio);

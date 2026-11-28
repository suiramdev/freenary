import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import type { CategoryAmount } from "./spending-breakdown";

/** The same thresholds as the API: at least one euro and at least one percent. */
export const MIN_PERIOD_CHANGE_MINOR = 100;
export const MIN_PERIOD_CHANGE_PERCENT = 1;

export interface PeriodChange {
  differenceMinor: number;
  percent: number | null;
  show: boolean;
}

export const periodChangeOf = (
  currentMinor: number,
  previousMinor?: number,
): PeriodChange => {
  const previous = previousMinor ?? 0;
  const differenceMinor = currentMinor - previous;
  const percent =
    previous === 0 ? null : (differenceMinor / Math.abs(previous)) * 100;
  const show =
    previous !== 0 &&
    percent !== null &&
    Math.abs(differenceMinor) >= MIN_PERIOD_CHANGE_MINOR &&
    Math.abs(percent) >= MIN_PERIOD_CHANGE_PERCENT;
  return { differenceMinor, percent, show };
};

/** A signed percent without the percent sign, for example "+12" or "-9". */
export const signedPercent = (percent: number): string =>
  new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
    signDisplay: "always",
  }).format(percent);

export const categoryChangeOf = (category: CategoryAmount): PeriodChange =>
  periodChangeOf(category.amount, category.previousAmount);

export const largestCategoryChanges = (
  categories: readonly CategoryAmount[],
  limit = 2,
): { category: CategoryAmount; change: PeriodChange }[] =>
  categories
    .map((category) => ({ category, change: categoryChangeOf(category) }))
    .filter(({ change }) => change.show)
    .toSorted(
      (a, b) =>
        Math.abs(b.change.differenceMinor) - Math.abs(a.change.differenceMinor),
    )
    .slice(0, limit);

/** "October" for a budget month, otherwise a short date range. */
export const previousPeriodLabel = (
  from: Date | string,
  to: Date | string,
  isBudgetMonth: boolean,
): string => {
  const locale = getLocale();
  const start = new Date(from);
  if (isBudgetMonth) {
    return new Intl.DateTimeFormat(locale, { month: "long" }).format(start);
  }
  const range = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });
  return range.format(start) + " \u2013 " + range.format(new Date(to));
};

export interface ChangeLine {
  text: string | null;
  tone?: string;
}

/** Text with a sign, not only colour: more spending is bad, more income is good. */
export const changeLineOf = (
  change: PeriodChange | undefined,
  goodWhenUp: boolean,
  previousLabel?: string,
): ChangeLine => {
  if (!change?.show || change.percent === null || !previousLabel) {
    return { text: null };
  }
  return {
    text: m.budget_change_vs_previous({
      percent: signedPercent(change.percent),
      previous: previousLabel,
    }),
    tone:
      (change.differenceMinor > 0) === goodWhenUp
        ? "text-success"
        : "text-destructive",
  };
};

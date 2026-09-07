import { filterCount } from "@/lib/budget/category-selection";
import type { CategoryFilter } from "@/lib/budget/category-selection";

/**
 * The transaction list's amount filter, in whole currency as the reader typed
 * it rather than in minor units. Zero is the absence of a bound — a floor of
 * zero filters nothing, and a ceiling of zero would filter everything away —
 * which is what lets a cleared bound drop out of the URL entirely.
 */
export interface AmountRange {
  max: number;
  min: number;
}

export const EMPTY_AMOUNT_RANGE: AmountRange = { max: 0, min: 0 };

const NOT_A_NUMBER = /[^\d.]/gu;
const SPACING = /[\s\u00A0\u202F']/gu;

/**
 * A bound as typed, in the reader's own notation: `1,234.56` under `en` and
 * `1 234,56` under `fr` are the same number, and both are what the list
 * renders and a reader copies out of it. The locale says which separator
 * groups; whatever is left of a decimal comma is a dot, and where several
 * survive the last one is the decimal point. Anything else reads as no bound
 * rather than as an error the reader then has to clear.
 */
export const parseAmountBound = (text: string, locale: string): number => {
  const group = new Intl.NumberFormat(locale)
    .formatToParts(11_111)
    .find((part) => part.type === "group")?.value;
  const bare = text
    .replace(SPACING, "")
    .replaceAll(group ?? ",", "")
    .replaceAll(",", ".");
  const decimal = bare.lastIndexOf(".");
  const point =
    decimal === -1
      ? bare
      : `${bare.slice(0, decimal).replaceAll(".", "")}.${bare.slice(decimal + 1)}`;

  const value = Number(point.replace(NOT_A_NUMBER, ""));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/** The URL counts in whole currency; the API counts in minor units. */
export const amountBoundsMinor = (amount: AmountRange) => ({
  amountMax: amount.max > 0 ? Math.round(amount.max * 100) : undefined,
  amountMin: amount.min > 0 ? Math.round(amount.min * 100) : undefined,
});

export const toggleMerchant = (merchants: string[], value: string): string[] =>
  merchants.includes(value)
    ? merchants.filter((merchant) => merchant !== value)
    : [...merchants, value];

/**
 * Everything narrowing the list right now, as one number: the badge over the
 * chips and the threshold that earns a "clear all" both count filters, not the
 * controls they came from, so an amount range counts once.
 */
export const activeFilterCount = (
  filter: CategoryFilter,
  merchants: string[],
  amount: AmountRange
): number =>
  filterCount(filter) +
  merchants.length +
  (amount.min > 0 || amount.max > 0 ? 1 : 0);

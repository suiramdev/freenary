import { categoriesInGroup } from "@freenary/api/lib/taxonomy";
import type { SpendingCategory } from "@freenary/api/lib/taxonomy";

import {
  EMPTY_CATEGORY_FILTER,
  filterCount,
} from "@/lib/budget/category-selection";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import {
  merchantLabel,
  monthlyEquivalentMinor,
  recurringSections,
} from "@/lib/budget/recurring";
import type {
  RecurrenceConfidence,
  RecurrenceFrequency,
  RecurringItem,
  RecurringSection,
} from "@/lib/budget/recurring";
import type { RecurringSortMode } from "@/lib/budget/search";
import { EMPTY_AMOUNT_RANGE } from "@/lib/budget/transaction-filters";
import type { AmountRange } from "@/lib/budget/transaction-filters";
import { foldForSearch } from "@/lib/search-text";

/**
 * What narrows the Recurring list. Detection reads a whole year in one
 * response, so every one of these is applied here rather than asked of the
 * server: narrowing the list costs no request and contradicts no chart.
 */
export interface RecurringFilter {
  /** Bounds on the monthly equivalent, in whole currency as it was typed. */
  amount: AmountRange;
  categories: CategoryFilter;
  confidences: RecurrenceConfidence[];
  frequencies: RecurrenceFrequency[];
  search: string;
}

export const EMPTY_RECURRING_FILTER: RecurringFilter = {
  amount: EMPTY_AMOUNT_RANGE,
  categories: EMPTY_CATEGORY_FILTER,
  confidences: [],
  frequencies: [],
  search: "",
};

const MINOR_PER_UNIT = 100;

/**
 * Everything narrowing the list right now, as one number: the badge over the
 * chips and the threshold that earns a "clear all" both count filters, not the
 * controls they came from, so an amount range counts once. The search box
 * carries its own text and is not one of them.
 */
export const recurringFilterCount = (filter: RecurringFilter): number =>
  filterCount(filter.categories) +
  filter.frequencies.length +
  filter.confidences.length +
  (filter.amount.min > 0 || filter.amount.max > 0 ? 1 : 0);

export const toggleFrequency = (
  frequencies: RecurrenceFrequency[],
  value: RecurrenceFrequency
): RecurrenceFrequency[] =>
  frequencies.includes(value)
    ? frequencies.filter((entry) => entry !== value)
    : [...frequencies, value];

export const toggleConfidence = (
  confidences: RecurrenceConfidence[],
  value: RecurrenceConfidence
): RecurrenceConfidence[] =>
  confidences.includes(value)
    ? confidences.filter((entry) => entry !== value)
    : [...confidences, value];

/** A ticked group stands for its categories, exactly as the server unions them. */
const allowedCategories = (
  filter: CategoryFilter
): Set<SpendingCategory> | null => {
  if (filter.categories.length === 0 && filter.groups.length === 0) {
    return null;
  }
  const allowed = new Set<SpendingCategory>(filter.categories);
  for (const group of filter.groups) {
    for (const category of categoriesInGroup(group)) {
      allowed.add(category);
    }
  }
  return allowed;
};

/** The bank's own text is what a reader types, so the key counts as a name. */
const matchesSearch = (item: RecurringItem, needle: string): boolean =>
  needle.length === 0 ||
  foldForSearch(merchantLabel(item)).includes(needle) ||
  foldForSearch(item.merchantKey).includes(needle);

export const filterRecurringItems = (
  items: RecurringItem[],
  filter: RecurringFilter
): RecurringItem[] => {
  const allowed = allowedCategories(filter.categories);
  const needle = foldForSearch(filter.search.trim());
  const minMinor = filter.amount.min * MINOR_PER_UNIT;
  const maxMinor = filter.amount.max * MINOR_PER_UNIT;

  return items.filter((item) => {
    if (allowed !== null && !allowed.has(item.category)) {
      return false;
    }
    if (
      filter.frequencies.length > 0 &&
      !filter.frequencies.includes(item.frequency)
    ) {
      return false;
    }
    if (
      filter.confidences.length > 0 &&
      !filter.confidences.includes(item.confidence)
    ) {
      return false;
    }
    // The bounds read against what the payment costs a month, which is the
    // figure the filter sits beside.
    const monthly = monthlyEquivalentMinor(item);
    if (minMinor > 0 && monthly < minMinor) {
      return false;
    }
    if (maxMinor > 0 && monthly > maxMinor) {
      return false;
    }
    return matchesSearch(item, needle);
  });
};

/** Soonest due, or dearest a month, with the other figure breaking the tie. */
export const sortRecurringItems = (
  items: RecurringItem[],
  sort: RecurringSortMode
): RecurringItem[] =>
  items.toSorted((a, b) =>
    sort === "next"
      ? Date.parse(a.nextExpected) - Date.parse(b.nextExpected) ||
        monthlyEquivalentMinor(b) - monthlyEquivalentMinor(a)
      : monthlyEquivalentMinor(b) - monthlyEquivalentMinor(a) ||
        Date.parse(a.nextExpected) - Date.parse(b.nextExpected)
  );

export interface RecurringGroups {
  behavioral: RecurringSection;
  fixed: RecurringSection;
}

/**
 * The list as the reader asked for it: narrowed, split by kind, each side in
 * the chosen order. Both kinds always come back — an empty side is a fact
 * about the filter, and its tab still owes a total.
 */
export const groupRecurringItems = (
  items: RecurringItem[],
  filter: RecurringFilter,
  sort: RecurringSortMode
): RecurringGroups => {
  const [fixed, behavioral] = recurringSections(
    filterRecurringItems(items, filter)
  );

  return {
    behavioral: {
      ...behavioral,
      items: sortRecurringItems(behavioral.items, sort),
    },
    fixed: { ...fixed, items: sortRecurringItems(fixed.items, sort) },
  };
};

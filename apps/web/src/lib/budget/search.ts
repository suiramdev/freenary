import {
  CATEGORY_GROUPS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/taxonomy";
import { z } from "zod";

import { AGGREGATION_MODES, TIME_RANGES } from "@/lib/budget/period";
import {
  RECURRENCE_CONFIDENCES,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_KINDS,
} from "@/lib/budget/recurring";

export const PRIMARY_VIEWS = ["flow", "categories"] as const;
export const COMPANION_VIEWS = ["fixed", "planned"] as const;
export const RECURRING_VIEWS = ["trend", "forecast", "scatter"] as const;
export const RECURRING_COMPANION_VIEWS = [
  "categories",
  "frequency",
  "split",
] as const;
export const TRANSACTION_DIRECTIONS = ["outgoing", "incoming"] as const;
export const SORT_MODES = ["date", "amount"] as const;
/** Soonest due, or dearest a month: the Recurring list's two orderings. */
export const RECURRING_SORT_MODES = ["next", "cost"] as const;

export type PrimaryView = (typeof PRIMARY_VIEWS)[number];
export type CompanionView = (typeof COMPANION_VIEWS)[number];
export type RecurringView = (typeof RECURRING_VIEWS)[number];
export type RecurringCompanionView = (typeof RECURRING_COMPANION_VIEWS)[number];
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];
export type SortMode = (typeof SORT_MODES)[number];
export type RecurringSortMode = (typeof RECURRING_SORT_MODES)[number];

// Anything outside a plausible calendar turns every derived Date into noise.
const MIN_YEAR = 1970;
const MAX_YEAR = 2999;

// Bounds a reader could plausibly mean, and a filter list a picker could
// plausibly have produced.
const MAX_AMOUNT = 1_000_000_000;
const MAX_MERCHANTS = 50;

const LAST_MONTH_INDEX = 11;

/**
 * A URL carries whatever the sender typed, and the router JSON-parses it, so
 * every field reads through a parser that answers "absent" instead of throwing:
 * a mangled link must open the default view, never a route error.
 */
const oneOf = <T extends string>(allowed: readonly T[]) =>
  z
    .unknown()
    .transform((raw) => {
      const parsed = z.enum(allowed).safeParse(raw);
      return parsed.success ? parsed.data : undefined;
    })
    .optional();

/** Same tolerance for a repeated param, which may also arrive as a scalar. */
const slugList = <T extends string>(allowed: readonly T[]) =>
  z
    .unknown()
    .transform((raw) => {
      const slug = z.enum(allowed);
      const values = Array.isArray(raw) ? raw : [raw];
      const kept = values.flatMap((value) => {
        const parsed = slug.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      });
      return kept.length > 0 ? kept : undefined;
    })
    .optional();

const boundedInt = (min: number, max: number) =>
  z
    .unknown()
    .transform((raw) => {
      const parsed = z.number().int().min(min).max(max).safeParse(raw);
      return parsed.success ? parsed.data : undefined;
    })
    .optional();

// A numeric search term arrives as a number once the router parses it, and an
// empty box is the absence of a search rather than a search for nothing.
const searchText = z
  .unknown()
  .transform((raw) => {
    const parsed = z.coerce.string().safeParse(raw);
    return parsed.success && parsed.data.length > 0 ? parsed.data : undefined;
  })
  .optional();

/**
 * An amount bound, in whole currency as the reader typed it. Zero is the
 * absence of a bound, and the ceiling keeps a mangled link from turning into a
 * query no index can serve.
 */
const amountBound = z
  .unknown()
  .transform((raw) => {
    const parsed = z.coerce.number().min(0).max(MAX_AMOUNT).safeParse(raw);
    return parsed.success && parsed.data > 0 ? parsed.data : undefined;
  })
  .optional();

/**
 * Merchant keys are bank text rather than a vocabulary this app owns, so the
 * only rules are non-empty and few enough that a hostile link cannot ask the
 * database for thousands of exact matches.
 */
const merchantList = z
  .unknown()
  .transform((raw) => {
    const values = Array.isArray(raw) ? raw : [raw];
    const kept = values.flatMap((value) => {
      const parsed = z.coerce.string().safeParse(value);
      return parsed.success && parsed.data.length > 0 ? [parsed.data] : [];
    });
    return kept.length > 0 ? kept.slice(0, MAX_MERCHANTS) : undefined;
  })
  .optional();

/**
 * Both budget views as URL text, in one schema on the route that owns them
 * both. Every field is optional and nothing defaults here: an absent param
 * means the default, so a clean view keeps a clean URL and a shared link
 * carries only what its sender changed. The `r`-prefixed fields belong to
 * Recurring, the rest to Transactions.
 */
export const budgetSearchSchema = z.object({
  agg: oneOf(AGGREGATION_MODES),
  cat: slugList(SPENDING_CATEGORIES),
  companion: oneOf(COMPANION_VIEWS),
  dir: oneOf(TRANSACTION_DIRECTIONS),
  grp: slugList(CATEGORY_GROUPS),
  max: amountBound,
  merchant: merchantList,
  min: amountBound,
  month: boundedInt(0, LAST_MONTH_INDEX),
  q: searchText,
  range: oneOf(TIME_RANGES),
  rcat: slugList(SPENDING_CATEGORIES),
  rcomp: oneOf(RECURRING_COMPANION_VIEWS),
  rconf: slugList(RECURRENCE_CONFIDENCES),
  rfreq: slugList(RECURRENCE_FREQUENCIES),
  rgrp: slugList(CATEGORY_GROUPS),
  rkind: oneOf(RECURRENCE_KINDS),
  rmax: amountBound,
  rmin: amountBound,
  rq: searchText,
  rsort: oneOf(RECURRING_SORT_MODES),
  rview: oneOf(RECURRING_VIEWS),
  sort: oneOf(SORT_MODES),
  view: oneOf(PRIMARY_VIEWS),
  year: boundedInt(MIN_YEAR, MAX_YEAR),
});

export type BudgetSearch = z.infer<typeof budgetSearchSchema>;

/** A field left out means "leave it alone"; clearing one sets its default. */
export type BudgetSearchPatch = BudgetSearch;

/**
 * The value each field falls back to when the URL omits it. `month` and `year`
 * are absent on purpose: their default is derived from the data, not fixed.
 */
export const BUDGET_SEARCH_DEFAULTS = {
  agg: "total",
  companion: "fixed",
  dir: "outgoing",
  max: 0,
  min: 0,
  q: "",
  range: "1M",
  rcomp: "categories",
  rkind: "fixed",
  rmax: 0,
  rmin: 0,
  rq: "",
  rsort: "cost",
  rview: "trend",
  sort: "date",
  view: "flow",
} as const satisfies Partial<BudgetSearch>;

/** A field holding its default is left out of the URL entirely. */
const stripDefault = <T extends number | string>(
  value: T | undefined,
  fallback: T
): T | undefined =>
  value === undefined || value === fallback ? undefined : value;

/** An empty selection is the absence of a filter, not a filter on nothing. */
const stripEmpty = <T extends string>(value: T[] | undefined) =>
  value && value.length > 0 ? value : undefined;

/** The Transactions fields of a merge: the period, the charts and the list. */
const nextTransactionsSearch = (
  current: BudgetSearch,
  patch: BudgetSearchPatch
) => ({
  agg: stripDefault(patch.agg ?? current.agg, BUDGET_SEARCH_DEFAULTS.agg),
  cat: stripEmpty(patch.cat ?? current.cat),
  companion: stripDefault(
    patch.companion ?? current.companion,
    BUDGET_SEARCH_DEFAULTS.companion
  ),
  dir: stripDefault(patch.dir ?? current.dir, BUDGET_SEARCH_DEFAULTS.dir),
  grp: stripEmpty(patch.grp ?? current.grp),
  max: stripDefault(patch.max ?? current.max, BUDGET_SEARCH_DEFAULTS.max),
  merchant: stripEmpty(patch.merchant ?? current.merchant),
  min: stripDefault(patch.min ?? current.min, BUDGET_SEARCH_DEFAULTS.min),
  month: patch.month ?? current.month,
  q: stripDefault(patch.q ?? current.q, BUDGET_SEARCH_DEFAULTS.q),
  range: stripDefault(
    patch.range ?? current.range,
    BUDGET_SEARCH_DEFAULTS.range
  ),
  sort: stripDefault(patch.sort ?? current.sort, BUDGET_SEARCH_DEFAULTS.sort),
  view: stripDefault(patch.view ?? current.view, BUDGET_SEARCH_DEFAULTS.view),
  year: patch.year ?? current.year,
});

/** The Recurring fields of a merge: both charts, the kind, and every filter. */
const nextRecurringSearch = (
  current: BudgetSearch,
  patch: BudgetSearchPatch
) => ({
  rcat: stripEmpty(patch.rcat ?? current.rcat),
  rcomp: stripDefault(
    patch.rcomp ?? current.rcomp,
    BUDGET_SEARCH_DEFAULTS.rcomp
  ),
  rconf: stripEmpty(patch.rconf ?? current.rconf),
  rfreq: stripEmpty(patch.rfreq ?? current.rfreq),
  rgrp: stripEmpty(patch.rgrp ?? current.rgrp),
  rkind: stripDefault(
    patch.rkind ?? current.rkind,
    BUDGET_SEARCH_DEFAULTS.rkind
  ),
  rmax: stripDefault(patch.rmax ?? current.rmax, BUDGET_SEARCH_DEFAULTS.rmax),
  rmin: stripDefault(patch.rmin ?? current.rmin, BUDGET_SEARCH_DEFAULTS.rmin),
  rq: stripDefault(patch.rq ?? current.rq, BUDGET_SEARCH_DEFAULTS.rq),
  rsort: stripDefault(
    patch.rsort ?? current.rsort,
    BUDGET_SEARCH_DEFAULTS.rsort
  ),
  rview: stripDefault(
    patch.rview ?? current.rview,
    BUDGET_SEARCH_DEFAULTS.rview
  ),
});

/**
 * Applies a patch and drops every field that now holds its default, so the URL
 * only ever spells out what the reader actually chose. A field the patch omits
 * keeps its current value; clearing one means passing its default. Both views
 * survive the merge: a filter on one must not clear the other's.
 */
export const nextBudgetSearch = (
  current: BudgetSearch,
  patch: BudgetSearchPatch
): BudgetSearch => ({
  ...nextTransactionsSearch(current, patch),
  ...nextRecurringSearch(current, patch),
});

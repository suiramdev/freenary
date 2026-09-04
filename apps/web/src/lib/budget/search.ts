import {
  CATEGORY_GROUPS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/taxonomy";
import { z } from "zod";

import { AGGREGATION_MODES, TIME_RANGES } from "@/lib/budget/period";

export const PRIMARY_VIEWS = ["flow", "categories"] as const;
export const COMPANION_VIEWS = ["fixed", "planned"] as const;
export const TRANSACTION_DIRECTIONS = ["outgoing", "incoming"] as const;
export const SORT_MODES = ["date", "amount"] as const;

export type PrimaryView = (typeof PRIMARY_VIEWS)[number];
export type CompanionView = (typeof COMPANION_VIEWS)[number];
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];
export type SortMode = (typeof SORT_MODES)[number];

// Anything outside a plausible calendar turns every derived Date into noise.
const MIN_YEAR = 1970;
const MAX_YEAR = 2999;

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
 * The whole budget view as URL text. Every field is optional and nothing
 * defaults here: an absent param means the default, so a clean view keeps a
 * clean URL and a shared link carries only what its sender changed.
 */
export const budgetSearchSchema = z.object({
  agg: oneOf(AGGREGATION_MODES),
  cat: slugList(SPENDING_CATEGORIES),
  companion: oneOf(COMPANION_VIEWS),
  dir: oneOf(TRANSACTION_DIRECTIONS),
  grp: slugList(CATEGORY_GROUPS),
  month: boundedInt(0, LAST_MONTH_INDEX),
  q: searchText,
  range: oneOf(TIME_RANGES),
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
  q: "",
  range: "1M",
  sort: "date",
  view: "flow",
} as const satisfies Partial<BudgetSearch>;

/** A field holding its default is left out of the URL entirely. */
const stripDefault = <T extends string>(
  value: T | undefined,
  fallback: T
): T | undefined =>
  value === undefined || value === fallback ? undefined : value;

/** An empty selection is the absence of a filter, not a filter on nothing. */
const stripEmpty = <T extends string>(value: T[] | undefined) =>
  value && value.length > 0 ? value : undefined;

/**
 * Applies a patch and drops every field that now holds its default, so the URL
 * only ever spells out what the reader actually chose. A field the patch omits
 * keeps its current value; clearing one means passing its default.
 */
export const nextBudgetSearch = (
  current: BudgetSearch,
  patch: BudgetSearchPatch
): BudgetSearch => ({
  agg: stripDefault(patch.agg ?? current.agg, BUDGET_SEARCH_DEFAULTS.agg),
  cat: stripEmpty(patch.cat ?? current.cat),
  companion: stripDefault(
    patch.companion ?? current.companion,
    BUDGET_SEARCH_DEFAULTS.companion
  ),
  dir: stripDefault(patch.dir ?? current.dir, BUDGET_SEARCH_DEFAULTS.dir),
  grp: stripEmpty(patch.grp ?? current.grp),
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

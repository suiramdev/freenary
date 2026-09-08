import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { useBudgetPeriod } from "@/hooks/budget/use-budget-period";
import type { BudgetPeriodPatch } from "@/hooks/budget/use-budget-period";
import { useSettledText } from "@/hooks/shared/use-settled-text";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { BUDGET_SEARCH_DEFAULTS, nextBudgetSearch } from "@/lib/budget/search";
import type {
  BudgetSearchPatch,
  CompanionView,
  PrimaryView,
  SortMode,
  TransactionDirection,
} from "@/lib/budget/search";
import type { AmountRange } from "@/lib/budget/transaction-filters";

// The route file imports this hook, so reach the route by id rather than back
// through its module. The params are validated one level up, on the area
// route, and inherited here.
const route = getRouteApi("/_auth/budget/transactions");

interface BudgetViewOptions {
  dateBounds?: { first: Date | null; last: Date | null };
}

/**
 * The Transactions view, read from the URL and written back to it: the period,
 * both chart views, and the list's direction, search, sort and category filter.
 * An absent param reads as its default here, so callers never see the
 * difference between a clean URL and a spelled-out one.
 */
export const useBudgetView = ({ dateBounds }: BudgetViewOptions) => {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const applyPatch = useCallback(
    (patch: BudgetSearchPatch) => {
      // The URL mirrors the view, so a filter or a keystroke must not fill the
      // Back button with one history entry each.
      navigate({
        replace: true,
        search: (prev) => nextBudgetSearch(prev, patch),
      });
    },
    [navigate]
  );

  const handlePeriodChange = useCallback(
    (patch: BudgetPeriodPatch) =>
      applyPatch({
        agg: patch.aggregation,
        month: patch.month,
        range: patch.range,
        year: patch.year,
      }),
    [applyPatch]
  );

  const period = useBudgetPeriod({
    aggregation: search.agg,
    dateBounds,
    month: search.month,
    onChange: handlePeriodChange,
    range: search.range,
    year: search.year,
  });

  const filter = useMemo<CategoryFilter>(
    () => ({ categories: search.cat ?? [], groups: search.grp ?? [] }),
    [search.cat, search.grp]
  );

  const amount = useMemo<AmountRange>(
    () => ({
      max: search.max ?? BUDGET_SEARCH_DEFAULTS.max,
      min: search.min ?? BUDGET_SEARCH_DEFAULTS.min,
    }),
    [search.max, search.min]
  );

  const merchants = useMemo(() => search.merchant ?? [], [search.merchant]);

  const publishSearchText = useCallback(
    (text: string) => applyPatch({ q: text }),
    [applyPatch]
  );
  const searchBox = useSettledText(
    search.q ?? BUDGET_SEARCH_DEFAULTS.q,
    publishSearchText
  );

  const companion: CompanionView =
    search.companion ?? BUDGET_SEARCH_DEFAULTS.companion;
  const direction: TransactionDirection =
    search.dir ?? BUDGET_SEARCH_DEFAULTS.dir;
  const sort: SortMode = search.sort ?? BUDGET_SEARCH_DEFAULTS.sort;
  const view: PrimaryView = search.view ?? BUDGET_SEARCH_DEFAULTS.view;

  return {
    amount,
    applyPatch,
    companion,
    direction,
    filter,
    merchants,
    period,
    searchQuery: searchBox.settled,
    searchText: searchBox.draft,
    setSearchText: searchBox.setDraft,
    sort,
    view,
  };
};

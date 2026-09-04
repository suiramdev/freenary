import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBudgetPeriod } from "@/hooks/budget/use-budget-period";
import type { BudgetPeriodPatch } from "@/hooks/budget/use-budget-period";
import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { BUDGET_SEARCH_DEFAULTS, nextBudgetSearch } from "@/lib/budget/search";
import type {
  BudgetSearchPatch,
  CompanionView,
  PrimaryView,
  SortMode,
  TransactionDirection,
} from "@/lib/budget/search";

// The route file imports this hook, so reach the route by id rather than back
// through its module.
const route = getRouteApi("/_auth/budget");

/** How long typing settles before it reaches the URL and the request. */
const SEARCH_SETTLE_MS = 300;

interface BudgetViewOptions {
  dateBounds?: { first: Date | null; last: Date | null };
}

/**
 * The whole budget view, read from the URL and written back to it: the period,
 * both chart views, and the transaction list's direction, search, sort and
 * category filter. An absent param reads as its default here, so callers never
 * see the difference between a clean URL and a spelled-out one.
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

  // The search box keeps its own text: a keystroke that waited for the URL to
  // round-trip would be re-rendered away, and only the settled text is worth a
  // history entry or a request.
  const urlText = search.q ?? BUDGET_SEARCH_DEFAULTS.q;
  const [draft, setDraft] = useState(urlText);
  const settled = useDebouncedValue(draft, SEARCH_SETTLE_MS);
  const syncedText = useRef(urlText);

  useEffect(() => {
    if (settled === syncedText.current) {
      return;
    }
    syncedText.current = settled;
    applyPatch({ q: settled });
  }, [applyPatch, settled]);

  // A shared link, Back or Forward carries text of its own, which wins.
  useEffect(() => {
    if (urlText !== syncedText.current) {
      syncedText.current = urlText;
      setDraft(urlText);
    }
  }, [urlText]);

  const companion: CompanionView =
    search.companion ?? BUDGET_SEARCH_DEFAULTS.companion;
  const direction: TransactionDirection =
    search.dir ?? BUDGET_SEARCH_DEFAULTS.dir;
  const sort: SortMode = search.sort ?? BUDGET_SEARCH_DEFAULTS.sort;
  const view: PrimaryView = search.view ?? BUDGET_SEARCH_DEFAULTS.view;

  return {
    applyPatch,
    companion,
    direction,
    filter,
    period,
    /** What the request uses, once the typing has settled. */
    searchQuery: settled,
    /** What the box shows, updated on every keystroke. */
    searchText: draft,
    setSearchText: setDraft,
    sort,
    view,
  };
};

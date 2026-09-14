import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import type { RecurrenceKind } from "@/lib/budget/recurring";
import type { RecurringFilter } from "@/lib/budget/recurring-filters";
import { BUDGET_SEARCH_DEFAULTS, nextBudgetSearch } from "@/lib/budget/search";
import type {
  BudgetSearchPatch,
  RecurringCompanionView,
  RecurringSortMode,
  RecurringView,
} from "@/lib/budget/search";

// The route file imports this hook, so reach the route by id rather than back
// through its module. The params are validated one level up, on the area
// route, and inherited here.
const route = getRouteApi("/_auth/budget/recurring");

/**
 * The Recurring view, read from the URL and written back to it: both chart
 * views, which kind of recurrence the list shows, its ordering and every
 * filter narrowing it. An absent param reads as its default here.
 */
export const useRecurringView = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const applyPatch = useCallback(
    (patch: BudgetSearchPatch) => {
      // The URL mirrors the view, so a filter or a keystroke must not fill the
      // Back button with one history entry each, nor throw the reader back to
      // the top of a page that never left the screen.
      navigate({
        replace: true,
        resetScroll: false,
        search: (prev) => nextBudgetSearch(prev, patch),
      });
    },
    [navigate]
  );

  const publishSearchText = useCallback(
    (text: string) => applyPatch({ rq: text }),
    [applyPatch]
  );

  const filter = useMemo<RecurringFilter>(
    () => ({
      amount: {
        max: search.rmax ?? BUDGET_SEARCH_DEFAULTS.rmax,
        min: search.rmin ?? BUDGET_SEARCH_DEFAULTS.rmin,
      },
      categories: {
        categories: search.rcat ?? [],
        groups: search.rgrp ?? [],
      },
      confidences: search.rconf ?? [],
      frequencies: search.rfreq ?? [],
      search: search.rq ?? BUDGET_SEARCH_DEFAULTS.rq,
    }),
    [
      search.rcat,
      search.rconf,
      search.rfreq,
      search.rgrp,
      search.rmax,
      search.rmin,
      search.rq,
    ]
  );

  const companion: RecurringCompanionView =
    search.rcomp ?? BUDGET_SEARCH_DEFAULTS.rcomp;
  const kind: RecurrenceKind = search.rkind ?? BUDGET_SEARCH_DEFAULTS.rkind;
  const sort: RecurringSortMode = search.rsort ?? BUDGET_SEARCH_DEFAULTS.rsort;
  const view: RecurringView = search.rview ?? BUDGET_SEARCH_DEFAULTS.rview;

  return {
    applyPatch,
    companion,
    filter,
    kind,
    searchQuery: search.rq ?? BUDGET_SEARCH_DEFAULTS.rq,
    setSearchQuery: publishSearchText,
    sort,
    view,
  };
};

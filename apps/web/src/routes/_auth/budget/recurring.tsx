import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { RiRepeatLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { RecurringCharts } from "@/components/budget/recurring-charts";
import { RecurringInsights } from "@/components/budget/recurring-insights";
import { RecurringKpiStrip } from "@/components/budget/recurring-kpi-strip";
import { RecurringList } from "@/components/budget/recurring-list";
import { useRecurringView } from "@/hooks/budget/use-recurring-view";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { recurringInsights, recurringSummary } from "@/lib/budget/recurring";
import type {
  RecurrenceConfidence,
  RecurrenceFrequency,
} from "@/lib/budget/recurring";
import { groupRecurringItems } from "@/lib/budget/recurring-filters";
import { BUDGET_SEARCH_DEFAULTS } from "@/lib/budget/search";
import type { AmountRange } from "@/lib/budget/transaction-filters";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

/**
 * What keeps costing money, and what it will cost next. Every figure comes off
 * one response: the server detects the patterns and measures the months, and
 * this page derives the rest, so a view switch or a filter costs no request.
 */
const RecurringPage = () => {
  const {
    applyPatch,
    companion,
    filter,
    kind,
    searchText,
    setSearchText,
    sort,
    view,
  } = useRecurringView();
  const recurringQuery = useQuery(orpc.budget.getRecurring.queryOptions());
  const { data } = recurringQuery;
  const { isError } = recurringQuery;
  const isPending = recurringQuery.isLoading;

  // Detection is a property of when it ran, not of when this rendered: a
  // clock read here would move every projection between two renders.
  const asOf = useMemo(() => (data ? new Date(data.asOf) : new Date()), [data]);

  const derived = useMemo(
    () =>
      data
        ? {
            insights: recurringInsights(data, asOf),
            summary: recurringSummary(data, asOf),
          }
        : null,
    [asOf, data]
  );

  const groups = useMemo(
    () => groupRecurringItems(data?.items ?? [], filter, sort),
    [data, filter, sort]
  );

  const handleCategoriesChange = useCallback(
    (next: CategoryFilter) =>
      applyPatch({ rcat: next.categories, rgrp: next.groups }),
    [applyPatch]
  );

  const handleAmountChange = useCallback(
    (next: AmountRange) => applyPatch({ rmax: next.max, rmin: next.min }),
    [applyPatch]
  );

  const handleFrequenciesChange = useCallback(
    (next: RecurrenceFrequency[]) => applyPatch({ rfreq: next }),
    [applyPatch]
  );

  const handleConfidencesChange = useCallback(
    (next: RecurrenceConfidence[]) => applyPatch({ rconf: next }),
    [applyPatch]
  );

  const handleClearFilters = useCallback(
    () =>
      applyPatch({
        rcat: [],
        rconf: [],
        rfreq: [],
        rgrp: [],
        rmax: BUDGET_SEARCH_DEFAULTS.rmax,
        rmin: BUDGET_SEARCH_DEFAULTS.rmin,
      }),
    [applyPatch]
  );

  const currency = data?.currency ?? "EUR";

  if (data !== undefined && data.items.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <p className="text-muted-foreground text-xs">
          {m.budget_recurring_scope()}
        </p>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiRepeatLine />
            </EmptyMedia>
            <EmptyTitle>{m.budget_recurring_empty_title()}</EmptyTitle>
            <EmptyDescription>
              {m.budget_recurring_empty_body()}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Recurring reads a fixed trailing year rather than the period the
          Transactions view carries, so it says so where that control sits. */}
      <p className="text-muted-foreground text-xs">
        {m.budget_recurring_scope()}
      </p>

      <RecurringInsights
        currency={currency}
        insights={derived?.insights ?? []}
        isPending={isPending}
      />

      <RecurringKpiStrip
        currency={currency}
        isError={isError}
        isPending={isPending}
        summary={derived?.summary}
      />

      <RecurringCharts
        companion={companion}
        data={data}
        isError={isError}
        isPending={isPending}
        onCompanionChange={(next) => applyPatch({ rcomp: next })}
        onViewChange={(next) => applyPatch({ rview: next })}
        view={view}
      />

      <RecurringList
        asOf={asOf}
        currency={currency}
        filter={filter}
        groups={groups}
        isError={isError}
        isPending={isPending}
        kind={kind}
        onAmountChange={handleAmountChange}
        onCategoriesChange={handleCategoriesChange}
        onClearFilters={handleClearFilters}
        onConfidencesChange={handleConfidencesChange}
        onFrequenciesChange={handleFrequenciesChange}
        onKindChange={(next) => applyPatch({ rkind: next })}
        onSearchChange={setSearchText}
        onSortChange={(next) => applyPatch({ rsort: next })}
        search={searchText}
        sort={sort}
      />
    </div>
  );
};

export const Route = createFileRoute("/_auth/budget/recurring")({
  component: RecurringPage,
});

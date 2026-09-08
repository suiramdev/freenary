import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";

import { BudgetCharts } from "@/components/budget/budget-charts";
import { BudgetKpiStrip } from "@/components/budget/budget-kpi-strip";
import { PeriodNavigator } from "@/components/budget/period-navigator";
import { TransactionDetailDrawer } from "@/components/budget/transaction-detail-drawer";
import { TransactionList } from "@/components/budget/transaction-list";
import { useBudgetView } from "@/hooks/budget/use-budget-view";
import {
  isStaleView,
  prefetchPeriod,
  prefetchTransactions,
  transactionsQueryOptions,
} from "@/lib/budget/budget-queries";
import type {
  PeriodInput,
  TransactionsInput,
} from "@/lib/budget/budget-queries";
import { toggleCategoryFilter } from "@/lib/budget/category-selection";
import type {
  CategoryFilter,
  CategorySelection,
} from "@/lib/budget/category-selection";
import type { SortMode, TransactionDirection } from "@/lib/budget/search";
import type { AmountRange } from "@/lib/budget/transaction-filters";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

const TransactionsPage = () => {
  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());
  const {
    amount,
    applyPatch,
    companion,
    direction,
    filter,
    merchants,
    period,
    searchQuery,
    setSearchQuery,
    sort,
    view,
  } = useBudgetView({
    dateBounds: accountsQuery.data
      ? {
          first: accountsQuery.data.firstTransactionDate,
          last: accountsQuery.data.lastTransactionDate,
        }
      : undefined,
  });
  const {
    aggregation,
    firstMonth,
    from,
    lastMonth,
    previewMonth,
    previewRange,
    range,
    setAggregation: handleAggregationChange,
    setMonth: handleMonthChange,
    setRange: handleRangeChange,
    to,
  } = period;
  // The drawer drills into one row rather than filtering the view, and a
  // foreign transaction id would only 404 for whoever opens the link.
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  const breakdownQuery = useQuery({
    ...orpc.budget.getSpendingBreakdown.queryOptions({
      input: { aggregation, from, to },
    }),
    placeholderData: keepPreviousData,
  });

  const sankeyQuery = useQuery({
    ...orpc.budget.getSankeyData.queryOptions({
      input: { aggregation, from, to },
    }),
    placeholderData: keepPreviousData,
  });

  const fixedVsVariableQuery = useQuery({
    ...orpc.budget.getFixedVsVariable.queryOptions({
      input: { aggregation, from, to },
    }),
    placeholderData: keepPreviousData,
  });

  const budgetVsActualQuery = useQuery({
    ...orpc.budget.getBudgetVsActual.queryOptions({
      input: { aggregation, from, to },
    }),
    placeholderData: keepPreviousData,
  });

  const listInput = useMemo<TransactionsInput>(
    () => ({
      amount,
      direction,
      filter,
      from,
      merchants,
      search: searchQuery,
      sort,
      to,
    }),
    [amount, direction, filter, from, merchants, searchQuery, sort, to]
  );

  const transactionsQuery = useInfiniteQuery(
    transactionsQueryOptions(listInput)
  );

  const queryClient = useQueryClient();

  const handleDirectionIntent = useCallback(
    (dir: TransactionDirection) =>
      prefetchTransactions(queryClient, { ...listInput, direction: dir }),
    [listInput, queryClient]
  );

  const handleSortIntent = useCallback(
    (next: SortMode) =>
      prefetchTransactions(queryClient, { ...listInput, sort: next }),
    [listInput, queryClient]
  );

  const handlePeriodIntent = useCallback(
    (target: PeriodInput) => prefetchPeriod(queryClient, target, listInput),
    [listInput, queryClient]
  );

  const handleLoadMore = useCallback(() => {
    if (
      transactionsQuery.hasNextPage &&
      !transactionsQuery.isFetchingNextPage
    ) {
      transactionsQuery.fetchNextPage();
    }
  }, [transactionsQuery]);

  const handleFilterChange = useCallback(
    (next: CategoryFilter) =>
      applyPatch({ cat: next.categories, grp: next.groups }),
    [applyPatch]
  );

  const handleAmountChange = useCallback(
    (next: AmountRange) => applyPatch({ max: next.max, min: next.min }),
    [applyPatch]
  );

  const handleMerchantsChange = useCallback(
    (next: string[]) => applyPatch({ merchant: next }),
    [applyPatch]
  );

  const handleSelect = useCallback(
    (selection: CategorySelection | null) =>
      handleFilterChange(toggleCategoryFilter(filter, selection)),
    [filter, handleFilterChange]
  );

  const allTransactions =
    transactionsQuery.data?.pages.flatMap((p) => p.transactions) ?? [];
  const totals = transactionsQuery.data?.pages[0]?.totals ?? {
    incoming: 0,
    outgoing: 0,
  };
  const selectedTransaction = selectedTransactionId
    ? (allTransactions.find((t) => t.id === selectedTransactionId) ?? null)
    : null;

  // One announcement for the whole page: every dimmed region is the same
  // answer on its way.
  const isUpdating = [
    breakdownQuery,
    sankeyQuery,
    fixedVsVariableQuery,
    budgetVsActualQuery,
    transactionsQuery,
  ].some(isStaleView);

  return (
    <div className="flex flex-1 flex-col gap-6">
      {isUpdating ? (
        <output className="sr-only">{m.budget_view_updating()}</output>
      ) : null}

      <PeriodNavigator
        aggregation={aggregation}
        from={from}
        to={to}
        range={range}
        firstMonth={firstMonth}
        lastMonth={lastMonth}
        onAggregationChange={handleAggregationChange}
        onRangeChange={handleRangeChange}
        onRangeIntent={(next) => handlePeriodIntent(previewRange(next))}
        onMonthChange={handleMonthChange}
        onMonthIntent={(year, month) =>
          handlePeriodIntent(previewMonth(year, month))
        }
      />

      <BudgetKpiStrip
        aggregation={aggregation}
        isError={sankeyQuery.isError}
        isPending={sankeyQuery.isLoading}
        isStale={isStaleView(sankeyQuery)}
        totalExpenses={sankeyQuery.data?.totalExpenses ?? 0}
        totalIncome={sankeyQuery.data?.totalIncome ?? 0}
      />

      <BudgetCharts
        activeGroups={filter.groups}
        aggregation={aggregation}
        breakdown={{
          data: breakdownQuery.data?.groups,
          isError: breakdownQuery.isError,
          isPending: breakdownQuery.isLoading,
          isStale: isStaleView(breakdownQuery),
        }}
        cashFlow={{
          data: sankeyQuery.data,
          isError: sankeyQuery.isError,
          isPending: sankeyQuery.isLoading,
          isStale: isStaleView(sankeyQuery),
        }}
        companion={companion}
        fixedVsVariable={{
          data: fixedVsVariableQuery.data,
          isError: fixedVsVariableQuery.isError,
          isPending: fixedVsVariableQuery.isLoading,
          isStale: isStaleView(fixedVsVariableQuery),
        }}
        onCompanionChange={(next) => applyPatch({ companion: next })}
        onSelect={handleSelect}
        onViewChange={(next) => applyPatch({ view: next })}
        planned={{
          data: budgetVsActualQuery.data,
          isError: budgetVsActualQuery.isError,
          isPending: budgetVsActualQuery.isLoading,
          isStale: isStaleView(budgetVsActualQuery),
        }}
        view={view}
      />

      <TransactionList
        amount={amount}
        transactions={allTransactions}
        totals={totals}
        direction={direction}
        onDirectionChange={(dir) => applyPatch({ dir })}
        onDirectionIntent={handleDirectionIntent}
        from={from}
        to={to}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onAmountChange={handleAmountChange}
        onFilterChange={handleFilterChange}
        merchants={merchants}
        onMerchantsChange={handleMerchantsChange}
        sort={sort}
        onSortChange={(next) => applyPatch({ sort: next })}
        onSortIntent={handleSortIntent}
        hasMore={transactionsQuery.hasNextPage}
        onLoadMore={handleLoadMore}
        isLoading={
          transactionsQuery.isLoading || transactionsQuery.isFetchingNextPage
        }
        isStale={isStaleView(transactionsQuery)}
        onTransactionClick={(tx) => setSelectedTransactionId(tx.id)}
        range={range}
      />

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={selectedTransactionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTransactionId(null);
          }
        }}
      />
    </div>
  );
};

export const Route = createFileRoute("/_auth/budget/transactions")({
  component: TransactionsPage,
});

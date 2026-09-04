import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { BudgetCharts } from "@/components/budget/budget-charts";
import { BudgetKpiStrip } from "@/components/budget/budget-kpi-strip";
import { NoBankAccount } from "@/components/budget/no-bank-account";
import { PeriodNavigator } from "@/components/budget/period-navigator";
import { TransactionDetailDrawer } from "@/components/budget/transaction-detail-drawer";
import { TransactionList } from "@/components/budget/transaction-list";
import { useAccountSync } from "@/hooks/budget/use-account-sync";
import { useBudgetView } from "@/hooks/budget/use-budget-view";
import { toggleCategoryFilter } from "@/lib/budget/category-selection";
import type {
  CategoryFilter,
  CategorySelection,
} from "@/lib/budget/category-selection";
import { budgetSearchSchema } from "@/lib/budget/search";
import { client, orpc } from "@/utils/orpc";

const BudgetPage = () => {
  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());
  const {
    applyPatch,
    companion,
    direction,
    filter,
    period,
    searchQuery,
    searchText,
    setSearchText,
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

  const transactionsQuery = useInfiniteQuery({
    queryKey: [
      "budget",
      "getTransactions",
      {
        from: from.toISOString(),
        to: to.toISOString(),
        direction,
        search: searchQuery,
        filter,
        sort,
      },
    ],
    queryFn: ({ pageParam }) =>
      client.budget.getTransactions({
        from,
        to,
        direction,
        search: searchQuery || undefined,
        categories:
          filter.categories.length > 0 ? filter.categories : undefined,
        groups: filter.groups.length > 0 ? filter.groups : undefined,
        sort,
        cursor: pageParam,
        limit: 50,
      }),
    // SAFETY: TanStack Query requires initialPageParam typed to match pageParam; undefined is the valid initial state
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });

  useAccountSync(accountsQuery.data?.hasAccounts);

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

  const handleSelect = useCallback(
    (selection: CategorySelection | null) =>
      handleFilterChange(toggleCategoryFilter(filter, selection)),
    [filter, handleFilterChange]
  );

  // Until the account list lands there is no telling whether this is the
  // budget or the empty state, and painting one only to swap it is worse than
  // the shell standing alone for a beat.
  if (accountsQuery.isPending) {
    return null;
  }

  if (!accountsQuery.data?.hasAccounts) {
    return <NoBankAccount />;
  }

  const allTransactions =
    transactionsQuery.data?.pages.flatMap((p) => p.transactions) ?? [];
  const totals = transactionsQuery.data?.pages[0]?.totals ?? {
    incoming: 0,
    outgoing: 0,
  };
  const selectedTransaction = selectedTransactionId
    ? (allTransactions.find((t) => t.id === selectedTransactionId) ?? null)
    : null;

  return (
    <div className="@container/budget flex flex-1 flex-col gap-6 p-4">
      <PeriodNavigator
        aggregation={aggregation}
        from={from}
        to={to}
        range={range}
        firstMonth={firstMonth}
        lastMonth={lastMonth}
        onAggregationChange={handleAggregationChange}
        onRangeChange={handleRangeChange}
        onMonthChange={handleMonthChange}
      />

      <BudgetKpiStrip
        aggregation={aggregation}
        isError={sankeyQuery.isError}
        isPending={sankeyQuery.isLoading}
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
        }}
        cashFlow={{
          data: sankeyQuery.data,
          isError: sankeyQuery.isError,
          isPending: sankeyQuery.isLoading,
        }}
        companion={companion}
        fixedVsVariable={{
          data: fixedVsVariableQuery.data,
          isError: fixedVsVariableQuery.isError,
          isPending: fixedVsVariableQuery.isLoading,
        }}
        onCompanionChange={(next) => applyPatch({ companion: next })}
        onSelect={handleSelect}
        onViewChange={(next) => applyPatch({ view: next })}
        planned={{
          data: budgetVsActualQuery.data,
          isError: budgetVsActualQuery.isError,
          isPending: budgetVsActualQuery.isLoading,
        }}
        view={view}
      />

      <TransactionList
        transactions={allTransactions}
        totals={totals}
        direction={direction}
        onDirectionChange={(dir) => applyPatch({ dir })}
        search={searchText}
        onSearchChange={setSearchText}
        filter={filter}
        onFilterChange={handleFilterChange}
        sort={sort}
        onSortChange={(next) => applyPatch({ sort: next })}
        hasMore={transactionsQuery.hasNextPage}
        onLoadMore={handleLoadMore}
        isLoading={
          transactionsQuery.isLoading || transactionsQuery.isFetchingNextPage
        }
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

export const Route = createFileRoute("/_auth/budget")({
  component: BudgetPage,
  validateSearch: budgetSearchSchema,
});

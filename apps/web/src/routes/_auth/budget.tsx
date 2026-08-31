import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { BudgetCharts } from "@/components/budget/budget-charts";
import { NoBankAccount } from "@/components/budget/no-bank-account";
import { PeriodNavigator } from "@/components/budget/period-navigator";
import { TransactionDetailDrawer } from "@/components/budget/transaction-detail-drawer";
import { TransactionList } from "@/components/budget/transaction-list";
import { useAccountSync } from "@/hooks/budget/use-account-sync";
import { useBudgetPeriod } from "@/hooks/budget/use-budget-period";
import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import {
  EMPTY_CATEGORY_FILTER,
  toggleCategoryFilter,
} from "@/lib/budget/category-selection";
import type {
  CategoryFilter,
  CategorySelection,
} from "@/lib/budget/category-selection";
import { client, orpc } from "@/utils/orpc";

const BudgetPage = () => {
  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());
  const {
    aggregation,
    firstMonth,
    from,
    lastMonth,
    to,
    range,
    setAggregation,
    setRange,
    setMonth,
  } = useBudgetPeriod(
    accountsQuery.data
      ? {
          first: accountsQuery.data.firstTransactionDate,
          last: accountsQuery.data.lastTransactionDate,
        }
      : undefined
  );
  const [direction, setDirection] = useState<"incoming" | "outgoing">(
    "outgoing"
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filter, setFilter] = useState<CategoryFilter>(EMPTY_CATEGORY_FILTER);
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

  const transactionsQuery = useInfiniteQuery({
    queryKey: [
      "budget",
      "getTransactions",
      {
        from: from.toISOString(),
        to: to.toISOString(),
        direction,
        search: debouncedSearch,
        filter,
      },
    ],
    queryFn: ({ pageParam }) =>
      client.budget.getTransactions({
        from,
        to,
        direction,
        search: debouncedSearch || undefined,
        categories:
          filter.categories.length > 0 ? filter.categories : undefined,
        groups: filter.groups.length > 0 ? filter.groups : undefined,
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

  const handleSelect = useCallback(
    (selection: CategorySelection | null) =>
      setFilter((prev) => toggleCategoryFilter(prev, selection)),
    []
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
    <div className="flex flex-1 flex-col gap-6 p-4">
      <PeriodNavigator
        aggregation={aggregation}
        from={from}
        to={to}
        range={range}
        firstMonth={firstMonth}
        lastMonth={lastMonth}
        onAggregationChange={setAggregation}
        onRangeChange={setRange}
        onMonthChange={setMonth}
      />

      <BudgetCharts
        aggregation={aggregation}
        breakdown={breakdownQuery.data?.groups}
        cashFlow={sankeyQuery.data}
        isBreakdownPending={breakdownQuery.isLoading}
        isCashFlowPending={sankeyQuery.isLoading}
        onSelect={handleSelect}
      />

      <TransactionList
        transactions={allTransactions}
        totals={totals}
        direction={direction}
        onDirectionChange={setDirection}
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
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
});

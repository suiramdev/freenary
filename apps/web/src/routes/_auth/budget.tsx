import { Skeleton } from "@freenary/ui/components/skeleton";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { BudgetPageSkeleton } from "@/components/budget/budget-page-skeleton";
import { CashFlowCard } from "@/components/budget/cash-flow-card";
import { NoBankAccount } from "@/components/budget/no-bank-account";
import { PeriodNavigator } from "@/components/budget/period-navigator";
import { SpendingBreakdownChart } from "@/components/budget/spending-breakdown-chart";
import { TransactionDetailSheet } from "@/components/budget/transaction-detail-sheet";
import { TransactionList } from "@/components/budget/transaction-list";
import { useAccountSync } from "@/hooks/budget/use-account-sync";
import { useBudgetPeriod } from "@/hooks/budget/use-budget-period";
import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { client, orpc } from "@/utils/orpc";

const BudgetPage = () => {
  const { aggregation, from, to, range, setAggregation, setRange, setMonth } =
    useBudgetPeriod();
  const [direction, setDirection] = useState<"incoming" | "outgoing">(
    "outgoing"
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());

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
      },
    ],
    queryFn: ({ pageParam }) =>
      client.budget.getTransactions({
        from,
        to,
        direction,
        search: debouncedSearch || undefined,
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

  if (accountsQuery.isLoading) {
    return <BudgetPageSkeleton />;
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
        onAggregationChange={setAggregation}
        onRangeChange={setRange}
        onMonthChange={setMonth}
      />

      {/* Charts group — side by side on wider viewports */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
        {sankeyQuery.isLoading && <Skeleton className="h-[280px]" />}
        {!sankeyQuery.isLoading && sankeyQuery.data && (
          <CashFlowCard
            aggregation={aggregation}
            incomeNodes={sankeyQuery.data.incomeNodes}
            expenseNodes={sankeyQuery.data.expenseNodes}
            incomeLinks={sankeyQuery.data.incomeLinks}
            expenseLinks={sankeyQuery.data.expenseLinks}
            totalIncome={sankeyQuery.data.totalIncome}
            totalExpenses={sankeyQuery.data.totalExpenses}
          />
        )}
        {breakdownQuery.isLoading && <Skeleton className="h-[320px]" />}
        {!breakdownQuery.isLoading && breakdownQuery.data?.categories.length ? (
          <SpendingBreakdownChart
            aggregation={aggregation}
            data={breakdownQuery.data.categories}
          />
        ) : null}
      </div>

      <TransactionList
        transactions={allTransactions}
        totals={totals}
        direction={direction}
        onDirectionChange={setDirection}
        search={search}
        onSearchChange={setSearch}
        hasMore={transactionsQuery.hasNextPage}
        onLoadMore={handleLoadMore}
        isLoading={
          transactionsQuery.isLoading || transactionsQuery.isFetchingNextPage
        }
        onTransactionClick={(tx) => setSelectedTransactionId(tx.id)}
        range={range}
      />

      <TransactionDetailSheet
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

import { Skeleton } from "@freenary/ui/components/skeleton";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BudgetPageSkeleton } from "@/components/budget/budget-page-skeleton";
import { formatCurrency } from "@/components/budget/format-currency";
import { NoBankAccount } from "@/components/budget/no-bank-account";
import { PeriodNavigator } from "@/components/budget/period-navigator";
import { SankeyChart } from "@/components/budget/sankey-chart";
import { SpendingBreakdownChart } from "@/components/budget/spending-breakdown-chart";
import { TransactionDetailSheet } from "@/components/budget/transaction-detail-sheet";
import { TransactionList } from "@/components/budget/transaction-list";
import type { TimeRange } from "@/components/budget/transaction-list";
import { client, orpc } from "@/utils/orpc";

const computeDateRange = (year: number, month: number, range: TimeRange) => {
  const anchor = new Date(year, month, 1);
  let from: Date;

  switch (range) {
    case "1M": {
      from = anchor;
      break;
    }
    case "3M": {
      from = new Date(year, month - 2, 1);
      break;
    }
    case "1Y": {
      from = new Date(year, month - 11, 1);
      break;
    }
    default: {
      from = anchor;
    }
  }

  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
};

const BudgetPage = () => {
  const now = new Date();
  const [anchorYear, setAnchorYear] = useState(now.getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(now.getMonth());
  const [range, setRange] = useState<TimeRange>("1M");
  const [direction, setDirection] = useState<"incoming" | "outgoing">(
    "outgoing"
  );
  const [search, setSearch] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  const { from, to } = useMemo(
    () => computeDateRange(anchorYear, anchorMonth, range),
    [anchorYear, anchorMonth, range]
  );

  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());

  const breakdownQuery = useQuery(
    orpc.budget.getSpendingBreakdown.queryOptions({
      input: { from, to },
    })
  );

  const sankeyQuery = useQuery(
    orpc.budget.getSankeyData.queryOptions({
      input: { from, to },
    })
  );

  const transactionsQuery = useInfiniteQuery({
    queryKey: [
      "budget",
      "getTransactions",
      { from: from.toISOString(), to: to.toISOString(), direction, search },
    ],
    queryFn: ({ pageParam }) =>
      client.budget.getTransactions({
        from,
        to,
        direction,
        search: search || undefined,
        cursor: pageParam,
        limit: 50,
      }),
    // SAFETY: TanStack Query requires initialPageParam typed to match pageParam; undefined is the valid initial state
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const syncMutation = useMutation({
    mutationFn: () => client.budget.syncAccounts(),
    onError: () => {
      toast.error("Failed to sync transactions", {
        action: {
          label: "Retry",
          onClick: () => syncMutation.mutate(),
        },
      });
    },
  });

  const hasSynced = useRef(false);
  useEffect(() => {
    if (accountsQuery.data?.hasAccounts && !hasSynced.current) {
      hasSynced.current = true;
      syncMutation.mutate();
    }
  }, [accountsQuery.data?.hasAccounts, syncMutation]);

  const handleMonthChange = useCallback(
    (year: number, month: number) => {
      setAnchorYear(year);
      setAnchorMonth(month);
    },
    [setAnchorYear, setAnchorMonth]
  );

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
        from={from}
        to={to}
        range={range}
        onRangeChange={setRange}
        onMonthChange={handleMonthChange}
      />

      {/* Charts group — side by side on wider viewports */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
        {(() => {
          if (sankeyQuery.isLoading) {
            return <Skeleton className="h-[280px]" />;
          }
          if (sankeyQuery.data) {
            return (
              <SankeyChart
                incomeNodes={sankeyQuery.data.incomeNodes}
                expenseNodes={sankeyQuery.data.expenseNodes}
                incomeLinks={sankeyQuery.data.incomeLinks}
                expenseLinks={sankeyQuery.data.expenseLinks}
                totalIncome={sankeyQuery.data.totalIncome}
                totalExpenses={sankeyQuery.data.totalExpenses}
              />
            );
          }
          return null;
        })()}
        {(() => {
          if (breakdownQuery.isLoading) {
            return <Skeleton className="h-[320px]" />;
          }
          if (breakdownQuery.data?.categories.length) {
            return (
              <SpendingBreakdownChart data={breakdownQuery.data.categories} />
            );
          }
          return null;
        })()}
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
        formatAmount={formatCurrency}
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
        formatAmount={formatCurrency}
      />
    </div>
  );
};

export const Route = createFileRoute("/_auth/budget")({
  component: BudgetPage,
});

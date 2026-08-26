import { Skeleton } from "@freenary/ui/components/skeleton";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CashFlowChart } from "@/components/budget/cash-flow-chart";
import { formatCurrency } from "@/components/budget/format-currency";
import { NoBankAccount } from "@/components/budget/no-bank-account";
import { PeriodNavigator } from "@/components/budget/period-navigator";
import { TransactionList } from "@/components/budget/transaction-list";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/budget")({
  component: BudgetPage,
});

type TimeRange = "1M" | "3M" | "1Y";

const computeDateRange = (
  year: number,
  month: number,
  range: TimeRange
): { from: Date; to: Date } => {
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
  }

  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
};

// eslint-disable-next-line no-use-before-define -- TanStack Router pattern: Route references component defined below
function BudgetPage() {
  const now = new Date();
  const [anchorYear, setAnchorYear] = useState(now.getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(now.getMonth());
  const [range, setRange] = useState<TimeRange>("1M");
  const [direction, setDirection] = useState<"incoming" | "outgoing">(
    "outgoing"
  );
  const [search, setSearch] = useState("");

  const { from, to } = useMemo(
    () => computeDateRange(anchorYear, anchorMonth, range),
    [anchorYear, anchorMonth, range]
  );

  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());

  const cashFlowQuery = useQuery(
    orpc.budget.getCashFlow.queryOptions({
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

  useEffect(() => {
    if (accountsQuery.data?.hasAccounts) {
      syncMutation.mutate();
    }
    // Fire once on mount when accounts are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsQuery.data?.hasAccounts]);

  const handleMonthChange = useCallback((year: number, month: number) => {
    setAnchorYear(year);
    setAnchorMonth(month);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (
      transactionsQuery.hasNextPage &&
      !transactionsQuery.isFetchingNextPage
    ) {
      transactionsQuery.fetchNextPage();
    }
  }, [transactionsQuery]);

  if (accountsQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <SpinnerGapIcon className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <PeriodNavigator
        from={from}
        to={to}
        range={range}
        onRangeChange={setRange}
        onMonthChange={handleMonthChange}
      />
      {cashFlowQuery.isLoading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : (cashFlowQuery.data ? (
        <CashFlowChart
          data={cashFlowQuery.data.periods}
          formatValue={(v) => formatCurrency(v)}
        />
      ) : null)}
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
      />
    </div>
  );
}

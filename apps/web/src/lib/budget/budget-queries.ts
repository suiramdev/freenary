import type { QueryClient } from "@tanstack/react-query";
import { infiniteQueryOptions, keepPreviousData } from "@tanstack/react-query";

import type { CategoryFilter } from "@/lib/budget/category-selection";
import type { AggregationMode } from "@/lib/budget/period";
import type { SortMode, TransactionDirection } from "@/lib/budget/search";
import { amountBoundsMinor } from "@/lib/budget/transaction-filters";
import type { AmountRange } from "@/lib/budget/transaction-filters";
import { client, orpc } from "@/utils/orpc";

/**
 * Hand-built rather than `orpc.budget.getTransactions.key()`: the list is an
 * infinite query, and the key has to stay matchable by prefix.
 */
export const TRANSACTIONS_QUERY_KEY = ["budget", "getTransactions"] as const;

/** What every chart on the page reads: a period, and how to summarise it. */
export interface PeriodInput {
  aggregation: AggregationMode;
  from: Date;
  to: Date;
}

/** Everything the transaction list is narrowed by, its period included. */
export interface TransactionsInput {
  amount: AmountRange;
  direction: TransactionDirection;
  filter: CategoryFilter;
  from: Date;
  merchants: string[];
  search: string;
  sort: SortMode;
  to: Date;
}

const PAGE_SIZE = 50;

export const transactionsQueryOptions = ({
  amount,
  direction,
  filter,
  from,
  merchants,
  search,
  sort,
  to,
}: TransactionsInput) => {
  const { amountMax, amountMin } = amountBoundsMinor(amount);

  // oxlint-disable-next-line sort-keys -- TanStack infers the page type from `queryFn`, so a later `getNextPageParam` reads its `lastPage`; alphabetical order puts it first, where the page is `unknown`.
  return infiniteQueryOptions({
    queryKey: [
      ...TRANSACTIONS_QUERY_KEY,
      {
        amountMax,
        amountMin,
        direction,
        filter,
        from: from.toISOString(),
        merchants,
        search,
        sort,
        to: to.toISOString(),
      },
    ],
    queryFn: ({ pageParam }) =>
      client.budget.getTransactions({
        amountMax,
        amountMin,
        categories:
          filter.categories.length > 0 ? filter.categories : undefined,
        cursor: pageParam,
        direction,
        from,
        groups: filter.groups.length > 0 ? filter.groups : undefined,
        limit: PAGE_SIZE,
        merchants: merchants.length > 0 ? merchants : undefined,
        search: search || undefined,
        sort,
        to,
      }),
    // SAFETY: TanStack Query requires initialPageParam typed to match pageParam; undefined is the valid initial state
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
};

/**
 * Fills the cache for a view the reader has not asked for. Settled rather than
 * awaited, so a failed warm-up rejects nothing; the toast is suppressed for it
 * too, because the cache reports only failures a mounted component observes
 * (`createQueryClient` in `@/utils/orpc`).
 */
const warm = async (fetching: Promise<unknown>[]) => {
  await Promise.allSettled(fetching);
};

/**
 * The list under one more filter than the reader has applied. The global 60 s
 * `staleTime` makes a repeat a no-op, so a pointer resting twice on the same
 * control costs one request.
 */
export const prefetchTransactions = (
  queryClient: QueryClient,
  input: TransactionsInput
) => {
  void warm([queryClient.infiniteQuery(transactionsQueryOptions(input))]);
};

/** Every request the Transactions page makes for one period, at once. */
export const prefetchPeriod = (
  queryClient: QueryClient,
  period: PeriodInput,
  list: Omit<TransactionsInput, "from" | "to">
) => {
  void warm([
    queryClient.query(
      orpc.budget.getSpendingBreakdown.queryOptions({ input: period })
    ),
    queryClient.query(
      orpc.budget.getSankeyData.queryOptions({ input: period })
    ),
    queryClient.query(
      orpc.budget.getFixedVsVariable.queryOptions({ input: period })
    ),
    queryClient.query(
      orpc.budget.getBudgetVsActual.queryOptions({ input: period })
    ),
    queryClient.infiniteQuery(
      transactionsQueryOptions({ ...list, from: period.from, to: period.to })
    ),
  ]);
};

/**
 * True while what is on screen belongs to the previous view and the next one
 * is on its way.
 */
export const isStaleView = (query: {
  isFetching: boolean;
  isPlaceholderData: boolean;
}) => query.isPlaceholderData && query.isFetching;

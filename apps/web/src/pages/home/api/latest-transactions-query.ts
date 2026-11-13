import { infiniteQueryOptions } from "@tanstack/react-query";

import { TRANSACTIONS_QUERY_KEY } from "@/entities/budget";
import { client } from "@/shared/api";

const EARLIEST_BANK_DATE = new Date(0);

// SAFETY: TanStack Query requires initialPageParam typed to match pageParam; undefined is the valid initial state
const INITIAL_PAGE_PARAM = undefined as string | undefined;

export const latestTransactionsQueryOptions = ({
  pageSize,
}: {
  pageSize: number;
}) =>
  // oxlint-disable-next-line sort-keys -- TanStack infers the page type from `queryFn`, so a later `getNextPageParam` reads its `lastPage`; alphabetical order puts it first, where the page is `unknown`.
  infiniteQueryOptions({
    queryKey: [...TRANSACTIONS_QUERY_KEY, "latest", { pageSize }],
    queryFn: ({ pageParam }) =>
      client.budget.getTransactions({
        cursor: pageParam,
        from: EARLIEST_BANK_DATE,
        limit: pageSize,
        sort: "date",
        to: new Date(),
      }),
    initialPageParam: INITIAL_PAGE_PARAM,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

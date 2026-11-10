import { infiniteQueryOptions } from "@tanstack/react-query";

import { client } from "@/shared/api";

import { TRANSACTIONS_QUERY_KEY } from "./budget-cache";

const EARLIEST_BANK_DATE = new Date(0);

// SAFETY: TanStack Query requires initialPageParam typed to match pageParam; undefined is the valid initial state
const INITIAL_PAGE_PARAM = undefined as string | undefined;

export const latestTransactionsQueryOptions = ({
  accountId,
  pageSize,
}: {
  accountId?: string;
  pageSize: number;
}) =>
  // oxlint-disable-next-line sort-keys -- TanStack infers the page type from `queryFn`, so a later `getNextPageParam` reads its `lastPage`; alphabetical order puts it first, where the page is `unknown`.
  infiniteQueryOptions({
    queryKey: [...TRANSACTIONS_QUERY_KEY, "latest", { accountId, pageSize }],
    queryFn: ({ pageParam }) =>
      client.budget.getTransactions({
        accountId,
        cursor: pageParam,
        from: EARLIEST_BANK_DATE,
        limit: pageSize,
        sort: "date",
        to: new Date(),
      }),
    initialPageParam: INITIAL_PAGE_PARAM,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

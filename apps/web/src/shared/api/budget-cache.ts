import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "./orpc";

export const TRANSACTIONS_QUERY_KEY = ["budget", "getTransactions"] as const;

export const invalidateBudgetData = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.budget.key() }),
    queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
  ]);

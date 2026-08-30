import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

/**
 * Every budget view is derived from transactions, so linking or unlinking a
 * bank makes all of them stale. The infinite transactions list hand-rolls a
 * flat query key that `orpc.budget.key()` cannot match, hence the second one.
 */
export const invalidateBudgetData = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.budget.key() }),
    queryClient.invalidateQueries({ queryKey: ["budget", "getTransactions"] }),
  ]);

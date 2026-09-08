import type { QueryClient } from "@tanstack/react-query";

import { TRANSACTIONS_QUERY_KEY } from "@/lib/budget/budget-queries";
import { orpc } from "@/utils/orpc";

/**
 * Every budget view is derived from transactions, so connecting or
 * disconnecting a bank makes all of them stale. The infinite transactions list
 * hand-rolls a flat query key that `orpc.budget.key()` cannot match, hence the
 * second one.
 */
export const invalidateBudgetData = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.budget.key() }),
    queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
  ]);

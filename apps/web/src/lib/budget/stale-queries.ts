import type { QueryClient } from "@tanstack/react-query";

import { TRANSACTIONS_QUERY_KEY } from "@/lib/budget/budget-queries";
import { orpc } from "@/utils/orpc";

export const invalidateBudgetData = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.budget.key() }),
    queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
  ]);

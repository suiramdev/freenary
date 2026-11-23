import { DEFAULT_BUDGET_MONTH_START_DAY } from "@freenary/api/lib/budget-month";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/shared/api";

export const budgetMonthQueryOptions = () =>
  orpc.settings.getBudgetMonth.queryOptions();

export const useBudgetMonthStartDay = (): number | undefined => {
  const query = useQuery(budgetMonthQueryOptions());

  if (query.data) {
    return query.data.startDay;
  }

  return query.isError ? DEFAULT_BUDGET_MONTH_START_DAY : undefined;
};

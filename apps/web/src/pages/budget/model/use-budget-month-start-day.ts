import { useSuspenseQuery } from "@tanstack/react-query";

import { budgetMonthQueryOptions } from "@/entities/budget";

export const useBudgetMonthStartDay = (): number =>
  useSuspenseQuery(budgetMonthQueryOptions()).data.startDay;

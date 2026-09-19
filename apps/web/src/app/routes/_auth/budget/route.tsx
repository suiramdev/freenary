import { createFileRoute, retainSearchParams } from "@tanstack/react-router";

import { BudgetArea, budgetSearchSchema } from "@/pages/budget";

export const Route = createFileRoute("/_auth/budget")({
  component: BudgetArea,
  search: { middlewares: [retainSearchParams(true)] },
  validateSearch: budgetSearchSchema,
});

import { createFileRoute } from "@tanstack/react-router";

import { RecurringPage } from "@/pages/budget";

export const Route = createFileRoute("/_auth/budget/recurring")({
  component: RecurringPage,
});

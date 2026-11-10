import { createFileRoute } from "@tanstack/react-router";

import { BankAccountPage } from "@/pages/bank-account";

export const Route = createFileRoute("/_auth/accounts/$accountId")({
  component: BankAccountPage,
});

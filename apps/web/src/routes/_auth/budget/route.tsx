import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  retainSearchParams,
} from "@tanstack/react-router";

import { NoBankAccount } from "@/components/budget/no-bank-account";
import { SyncButton } from "@/components/shared/sync-button";
import { useAccountSync } from "@/hooks/budget/use-account-sync";
import { budgetSearchSchema } from "@/lib/budget/search";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

const BudgetArea = () => {
  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());
  const { isSyncing, resync } = useAccountSync(accountsQuery.data?.hasAccounts);

  const isAccountGateUndecided = accountsQuery.isPending;

  if (isAccountGateUndecided) {
    return null;
  }

  if (!accountsQuery.data?.hasAccounts) {
    return <NoBankAccount />;
  }

  return (
    <div className="@container/budget flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-end">
        <SyncButton
          isSyncing={isSyncing}
          label={m.budget_sync_now()}
          onSync={resync}
        />
      </div>
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/_auth/budget")({
  component: BudgetArea,
  search: { middlewares: [retainSearchParams(true)] },
  validateSearch: budgetSearchSchema,
});

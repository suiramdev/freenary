import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";

import { m } from "@/paraglide/messages.js";
import { orpc } from "@/shared/api";
import { SyncButton } from "@/shared/ui/sync-button";

import { useAccountSync } from "../model/use-account-sync";
import { NoBankAccount } from "./no-bank-account";

export const BudgetArea = () => {
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

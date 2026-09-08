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

/**
 * What both budget pages share: the account gate, the one sync the area runs,
 * and the container query every strip and chart below sizes itself against.
 * The search schema lives here too, so a link into either page validates
 * against one vocabulary.
 */
const BudgetArea = () => {
  const accountsQuery = useQuery(orpc.budget.getAccounts.queryOptions());
  const { isSyncing, resync } = useAccountSync(accountsQuery.data?.hasAccounts);

  // Until the account list lands there is no telling whether this is the
  // budget or the empty state, and painting one only to swap it is worse than
  // the shell standing alone for a beat.
  if (accountsQuery.isPending) {
    return null;
  }

  if (!accountsQuery.data?.hasAccounts) {
    return <NoBankAccount />;
  }

  return (
    <div className="@container/budget flex flex-1 flex-col gap-4 p-4">
      {/* A re-read feeds the transaction list and the recurrence detection
          alike, so the control belongs to the area rather than to one page. */}
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
  // A sidebar link carries no search of its own, and the router would answer
  // that with an empty one: both pages read the same vocabulary, so stepping
  // from one to the other must keep the view the reader built.
  search: { middlewares: [retainSearchParams(true)] },
  validateSearch: budgetSearchSchema,
});

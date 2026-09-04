import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { invalidateBudgetData } from "@/lib/budget/stale-queries";
import { m } from "@/paraglide/messages.js";
import { client } from "@/utils/orpc";

interface SyncVariables {
  /**
   * Re-read the provider's whole window and re-derive every category, rather
   * than resuming at the last sync. What the user asks for by hand.
   */
  force?: boolean;
}

/**
 * The page's one account sync: a background pass once accounts are known to
 * exist, and a forced re-run on demand.
 */
export const useAccountSync = (hasAccounts: boolean | undefined) => {
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: (variables: SyncVariables = {}) =>
      client.budget.syncAccounts({ force: variables.force }),
    onError: (_error, variables) => {
      toast.error(m.budget_sync_error(), {
        action: {
          label: m.budget_sync_retry(),
          onClick: () => syncMutation.mutate(variables),
        },
      });
    },
    // The page mounted before the sync ran, so every budget query on screen was
    // answered from the pre-sync rows and must be refetched, not waited out.
    onSuccess: async (result, variables) => {
      await invalidateBudgetData(queryClient);

      if (!result.success) {
        toast.error(m.budget_sync_error(), {
          action: {
            label: m.budget_sync_retry(),
            onClick: () => syncMutation.mutate(variables),
          },
        });
        return;
      }
      // The background pass is not something the user asked for, so it reports
      // only when it fails; a forced one owes an answer either way.
      if (!variables.force) {
        return;
      }
      toast.success(
        result.categorised > 0
          ? m.budget_sync_success_categorised({ count: result.categorised })
          : m.budget_sync_success()
      );
    },
  });

  const hasSynced = useRef(false);
  useEffect(() => {
    if (hasAccounts && !hasSynced.current) {
      hasSynced.current = true;
      syncMutation.mutate({});
    }
  }, [hasAccounts, syncMutation]);

  return {
    isSyncing: syncMutation.isPending,
    resync: () => syncMutation.mutate({ force: true }),
  };
};

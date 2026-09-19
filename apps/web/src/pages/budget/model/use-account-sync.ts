import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { m } from "@/paraglide/messages.js";
import { client, invalidateBudgetData } from "@/shared/api";

interface SyncVariables {
  force?: boolean;
}

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

      const wasAskedForByUser = variables.force === true;

      if (!wasAskedForByUser) {
        return;
      }

      toast.success(
        result.categorised > 0
          ? m.budget_sync_success_categorised({ count: result.categorised })
          : m.budget_sync_success()
      );
    },
  });

  const hasStartedBackgroundSync = useRef(false);
  useEffect(() => {
    if (hasAccounts && !hasStartedBackgroundSync.current) {
      hasStartedBackgroundSync.current = true;
      syncMutation.mutate({});
    }
  }, [hasAccounts, syncMutation]);

  return {
    isSyncing: syncMutation.isPending,
    resync: () => syncMutation.mutate({ force: true }),
  };
};

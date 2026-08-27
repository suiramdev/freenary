import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { client } from "@/utils/orpc";

/** Kicks off a single background account sync once accounts are known to exist. */
export const useAccountSync = (hasAccounts: boolean | undefined) => {
  const syncMutation = useMutation({
    mutationFn: () => client.budget.syncAccounts(),
    onError: () => {
      toast.error("Failed to sync transactions", {
        action: {
          label: "Retry",
          onClick: () => syncMutation.mutate(),
        },
      });
    },
  });

  const hasSynced = useRef(false);
  useEffect(() => {
    if (hasAccounts && !hasSynced.current) {
      hasSynced.current = true;
      syncMutation.mutate();
    }
  }, [hasAccounts, syncMutation]);
};

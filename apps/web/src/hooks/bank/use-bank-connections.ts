import type { AppRouter } from "@freenary/api/routers/index";
import type { InferRouterOutputs } from "@orpc/server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { invalidateBudgetData } from "@/lib/budget/stale-queries";
import { m } from "@/paraglide/messages.js";
import { client, orpc } from "@/utils/orpc";

export type BankConnection =
  InferRouterOutputs<AppRouter>["bankConnection"]["listConnections"]["connections"][number];

export type BankInstitution =
  InferRouterOutputs<AppRouter>["bankConnection"]["listInstitutions"]["banks"][number];

/** Where the provider callback sends the user once the exchange is done. */
export type BankConnectionReturnTo = "onboarding" | "settings";

/** One reference, so the row memo does not recompute before the query lands. */
const EMPTY_CONNECTIONS: BankConnection[] = [];

export const useBankConnections = ({
  returnTo,
}: {
  returnTo: BankConnectionReturnTo;
}) => {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<string | null>(null);

  const connectionsQuery = useQuery(
    orpc.bankConnection.listConnections.queryOptions()
  );

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) =>
      client.bankConnection.disconnect({ connectionId }),
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async ({
      accountsRemoved,
      institutionName,
      revocationRequested,
    }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.bankConnection.listConnections.queryOptions().queryKey,
        }),
        // The cascade took the accounts and their transactions with it.
        invalidateBudgetData(queryClient),
      ]);

      if (!revocationRequested) {
        toast.warning(
          m.bank_disconnect_revoke_warning({ institution: institutionName })
        );
        return;
      }
      if (accountsRemoved === 0) {
        toast.success(
          m.bank_disconnect_success({ institution: institutionName })
        );
        return;
      }
      toast.success(
        m.bank_disconnect_success_accounts({
          count: accountsRemoved,
          institution: institutionName,
        })
      );
    },
  });

  /**
   * Hands the browser to the bank. Nothing is marked connected here: the
   * connection only exists once the callback exchanged the code.
   */
  const connect = async (bank: BankInstitution) => {
    setConnecting(bank.id);
    const result = await client.bankConnection
      .startConnection({
        bankCountry: bank.country,
        institutionId: bank.id,
        returnTo,
        state: crypto.randomUUID(),
      })
      .catch(() => null);

    if (result?.url) {
      window.location.assign(result.url);
      return;
    }
    toast.error(m.bank_connect_error({ institution: bank.name }));
    setConnecting(null);
  };

  const connections = connectionsQuery.data?.connections ?? EMPTY_CONNECTIONS;

  return {
    connect,
    connecting,
    connections,
    disconnect: disconnectMutation.mutate,
    disconnectingId: disconnectMutation.isPending
      ? disconnectMutation.variables
      : null,
    // Only when nothing is cached: a failed refetch must not wipe a good answer.
    isConnectionsMissing:
      connectionsQuery.isError && connectionsQuery.data === undefined,
    isConnectionsPending: connectionsQuery.isPending,
  };
};

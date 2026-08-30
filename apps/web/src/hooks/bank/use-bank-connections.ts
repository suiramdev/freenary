import type { AppRouter } from "@freenary/api/routers/index";
import type { InferRouterOutputs } from "@orpc/server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { invalidateBudgetData } from "@/lib/budget/stale-queries";
import { client, orpc } from "@/utils/orpc";

export type BankConnection =
  InferRouterOutputs<AppRouter>["bankConnection"]["listConnections"]["connections"][number];

export type BankInstitution =
  InferRouterOutputs<AppRouter>["bankConnection"]["listInstitutions"]["banks"][number];

/** Where the provider callback sends the user once the exchange is done. */
export type BankConnectionReturnTo = "onboarding" | "settings";

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

  const unlinkMutation = useMutation({
    mutationFn: (connectionId: string) =>
      client.bankConnection.unlinkConnection({ connectionId }),
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async ({ accountsRemoved, institutionName, revoked }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.bankConnection.listConnections.queryOptions().queryKey,
        }),
        // The cascade took the accounts and their transactions with it.
        invalidateBudgetData(queryClient),
      ]);

      if (!revoked) {
        toast.warning(
          `${institutionName} removed, but access at the bank was not revoked. Revoke it from your bank to be sure.`
        );
        return;
      }
      toast.success(
        accountsRemoved === 0
          ? `${institutionName} unlinked`
          : `${institutionName} unlinked — ${accountsRemoved} account${accountsRemoved === 1 ? "" : "s"} removed`
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
    toast.error(`Could not connect to ${bank.name}. Try again later.`);
    setConnecting(null);
  };

  const connections = connectionsQuery.data?.connections;

  const connected = useMemo(() => {
    const rows = connections ?? [];
    return {
      connectedIds: new Set(
        rows
          .map((connection) => connection.institutionId)
          .filter((id): id is string => id !== null)
      ),
      connections: rows,
    };
  }, [connections]);

  return {
    ...connected,
    connect,
    connecting,
    isConnectionsError: connectionsQuery.isError,
    isConnectionsPending: connectionsQuery.isPending,
    isUnlinking: unlinkMutation.isPending,
    unlink: unlinkMutation.mutate,
    unlinkingId: unlinkMutation.isPending ? unlinkMutation.variables : null,
  };
};

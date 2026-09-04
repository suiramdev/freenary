import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { AUTH_ACCOUNTS_QUERY_KEY } from "@/lib/settings/auth-queries";
import { linkedAccountErrorMessage } from "@/lib/settings/security-error-messages";
import { m } from "@/paraglide/messages.js";

export const useLinkedAccountActions = () => {
  const queryClient = useQueryClient();

  // No success path to handle: the client follows the provider redirect, so
  // this mutation only ever settles when the server refuses.
  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const { origin } = window.location;
      const { error } = await authClient.linkSocial({
        callbackURL: `${origin}/settings`,
        errorCallbackURL: `${origin}/settings`,
        provider,
      });
      if (error) {
        throw new Error(linkedAccountErrorMessage(error));
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await authClient.unlinkAccount({ accountId });
      if (error) {
        throw new Error(linkedAccountErrorMessage(error));
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: AUTH_ACCOUNTS_QUERY_KEY,
      });
      toast.success(m.settings_accounts_disconnected_toast());
    },
  });

  return {
    connect: connectMutation.mutate,
    /** The provider being sent off, so only its own button shows a spinner. */
    connectingProvider: connectMutation.isPending
      ? connectMutation.variables
      : null,
    disconnect: disconnectMutation.mutate,
    disconnectingId: disconnectMutation.isPending
      ? disconnectMutation.variables
      : null,
  };
};

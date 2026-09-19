import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { m } from "@/paraglide/messages.js";
import { authClient } from "@/shared/auth";

import type { SecurityRequestError } from "./security-error-messages";
import { passkeyErrorMessage } from "./security-error-messages";

export interface PasskeyRenameInput {
  id: string;
  name: string;
}

const DISMISSED_CEREMONY_CODES = {
  ERROR_CEREMONY_ABORTED: true,
  ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY: true,
} satisfies Record<string, true>;

export const usePasskeyActions = () => {
  const addMutation = useMutation({
    mutationFn: async (name: string): Promise<boolean> => {
      const { error } = await authClient.passkey.addPasskey({ name });

      if (!error) {
        return true;
      }

      const refusal: SecurityRequestError = error;
      const code = refusal.code ?? "";
      const neverReachedTheServer = code === "" && refusal.status === undefined;
      const wasCeremonyDismissed =
        Object.hasOwn(DISMISSED_CEREMONY_CODES, code) || neverReachedTheServer;

      if (wasCeremonyDismissed) {
        return false;
      }

      throw new Error(passkeyErrorMessage(refusal));
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (wasAdded) => {
      if (wasAdded) {
        toast.success(m.settings_passkeys_added_toast());
      }
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: PasskeyRenameInput) => {
      const { error } = await authClient.passkey.updatePasskey({ id, name });

      if (error) {
        throw new Error(passkeyErrorMessage(error));
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success(m.settings_passkeys_renamed_toast());
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await authClient.passkey.deletePasskey({ id });

      if (error) {
        throw new Error(passkeyErrorMessage(error));
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success(m.settings_passkeys_removed_toast());
    },
  });

  return {
    add: addMutation.mutate,
    isAdding: addMutation.isPending,
    remove: removeMutation.mutate,
    removingId: removeMutation.isPending ? removeMutation.variables : null,
    rename: renameMutation.mutate,
    renamingId: renameMutation.isPending ? renameMutation.variables.id : null,
  };
};

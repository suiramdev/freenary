import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { passkeyErrorMessage } from "@/lib/settings/security-error-messages";
import { m } from "@/paraglide/messages.js";

export interface PasskeyRenameInput {
  id: string;
  name: string;
}

/**
 * WebAuthn codes for a prompt the user walked away from: `ERROR_CEREMONY_ABORTED`
 * when the page aborted it, the passthrough code when the browser refused with
 * `NotAllowedError`. Nothing was created and the user knows why, so no toast.
 */
const CANCELLED_CODES = {
  ERROR_CEREMONY_ABORTED: true,
  ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY: true,
} satisfies Record<string, true>;

/**
 * No query invalidation anywhere: `useListPasskeys` is a better-auth atom that
 * refetches on `/passkey/verify-registration`, `/passkey/delete-passkey` and
 * `/passkey/update-passkey`, which is every write below.
 */
export const usePasskeyActions = () => {
  const addMutation = useMutation({
    mutationFn: async (name: string): Promise<boolean> => {
      const { error } = await authClient.passkey.addPasskey({ name });
      if (!error) {
        return true;
      }

      const code = "code" in error ? error.code : "";
      // A dismissed prompt never reaches the server, so it has no status. A
      // codeless refusal that does — a 429, for one — is a real failure and
      // must not be swallowed as a cancellation.
      const isCancelled =
        Object.hasOwn(CANCELLED_CODES, code) ||
        (code === "" && error.status === undefined);
      if (isCancelled) {
        return false;
      }
      throw new Error(passkeyErrorMessage(error));
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
    /** The row that is busy, so only its own button shows a spinner. */
    removingId: removeMutation.isPending ? removeMutation.variables : null,
    rename: renameMutation.mutate,
    renamingId: renameMutation.isPending ? renameMutation.variables.id : null,
  };
};

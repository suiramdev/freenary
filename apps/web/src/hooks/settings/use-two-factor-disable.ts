import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { AUTH_SESSIONS_QUERY_KEY } from "@/lib/settings/auth-queries";
import { twoFactorErrorMessage } from "@/lib/settings/security-error-messages";
import { securityPasswordSchema } from "@/lib/settings/security-schemas";
import { m } from "@/paraglide/messages.js";

interface UseTwoFactorDisableOptions {
  /** Refetches the session, whose user carries the flag this section reads. */
  onDisabled: () => void;
  onDone: () => void;
}

export const useTwoFactorDisable = ({
  onDisabled,
  onDone,
}: UseTwoFactorDisableOptions) => {
  const queryClient = useQueryClient();
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => {
      setPasswordError(null);

      const { error } = await authClient.twoFactor.disable({
        password: value.password,
      });
      if (error) {
        setPasswordError(twoFactorErrorMessage(error));
        return;
      }

      // Turning the factor off can rotate the session, so the list is refetched
      // rather than left marking a token that no longer exists.
      onDisabled();
      await queryClient.invalidateQueries({
        queryKey: AUTH_SESSIONS_QUERY_KEY,
      });
      onDone();
      toast.success(m.settings_2fa_disabled_toast());
    },
    validators: { onSubmit: securityPasswordSchema },
  });

  const reset = useCallback(() => {
    setPasswordError(null);
    form.reset();
  }, [form]);

  return { form, passwordError, reset };
};

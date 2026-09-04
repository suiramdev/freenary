import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { AUTH_SESSIONS_QUERY_KEY } from "@/lib/settings/auth-queries";
import { twoFactorErrorMessage } from "@/lib/settings/security-error-messages";
import {
  securityPasswordSchema,
  totpCodeSchema,
} from "@/lib/settings/security-schemas";
import { m } from "@/paraglide/messages.js";

/** Enrolling walks all four; re-issuing recovery codes jumps password → codes. */
export type TwoFactorStage = "codes" | "confirm" | "password" | "scan";

export type TwoFactorPurpose = "enable" | "regenerate";

interface UseTwoFactorEnrollmentOptions {
  /** Refetches the session, whose user carries the flag this section reads. */
  onEnabled: () => void;
  purpose: TwoFactorPurpose;
}

export const useTwoFactorEnrollment = ({
  onEnabled,
  purpose,
}: UseTwoFactorEnrollmentOptions) => {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<TwoFactorStage>("password");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const passwordForm = useForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => {
      setPasswordError(null);

      if (purpose === "regenerate") {
        const { data, error } = await authClient.twoFactor.generateBackupCodes({
          password: value.password,
        });
        if (error) {
          setPasswordError(twoFactorErrorMessage(error));
          return;
        }
        setBackupCodes(data.backupCodes);
        setStage("codes");
        return;
      }

      const { data, error } = await authClient.twoFactor.enable({
        method: "totp",
        password: value.password,
      });
      if (error) {
        setPasswordError(twoFactorErrorMessage(error));
        return;
      }
      // The endpoint answers with a union over the requested method, and only
      // the TOTP branch carries a URI to scan.
      if (data.method !== "totp") {
        setPasswordError(m.settings_2fa_error_generic());
        return;
      }

      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes);
      setStage("scan");
    },
    validators: { onSubmit: securityPasswordSchema },
  });

  const codeForm = useForm({
    defaultValues: { code: "" },
    onSubmit: async ({ value }) => {
      setCodeError(null);

      const { error } = await authClient.twoFactor.verifyTotp({
        code: value.code.trim(),
      });
      if (error) {
        setCodeError(twoFactorErrorMessage(error));
        return;
      }

      // Confirming enrolment issues a fresh session, so the cached list would
      // otherwise offer the current one as a revocable stranger.
      onEnabled();
      await queryClient.invalidateQueries({
        queryKey: AUTH_SESSIONS_QUERY_KEY,
      });
      setStage("codes");
      toast.success(m.settings_2fa_enabled_toast());
    },
    validators: { onSubmit: totpCodeSchema },
  });

  const reset = useCallback(() => {
    setStage("password");
    setTotpUri("");
    setBackupCodes([]);
    setPasswordError(null);
    setCodeError(null);
    passwordForm.reset();
    codeForm.reset();
  }, [codeForm, passwordForm]);

  return {
    backupCodes,
    codeError,
    codeForm,
    passwordError,
    passwordForm,
    reset,
    /** Scanning cannot be verified, so leaving that stage is the user's call. */
    showConfirmStage: () => setStage("confirm"),
    stage,
    totpUri,
  };
};

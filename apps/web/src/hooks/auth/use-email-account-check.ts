import { ORPCError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { m } from "@/paraglide/messages.js";
import { client } from "@/utils/orpc";

const EMAIL_CHECK_DELAY_MS = 500;

// No message attached, so this one is safe to build once: it is only ever asked
// whether the address is complete enough to be worth a round trip.
const emailSchema = z.email();

/** Which fields the form reveals for the address currently typed. */
export type AccountMode = "signin" | "signup" | "unknown";

/** Why the address in the box has no answer, so the form can say why it has not
 * opened rather than looking like an email field and nothing else. */
type CheckFailure = "rate-limited" | "unavailable";

/** Answer of the last completed existence check, kept next to the address it
 * answered for. */
interface EmailCheck {
  email: string;
  mode: "signin" | "signup";
}

/** Refusal of the last completed check, kept next to the address it refused. */
interface FailedCheck {
  email: string;
  reason: CheckFailure;
}

/**
 * Asks the server whether an address already has an account, so the form can
 * reveal a password or a full sign-up. Debounced: the reader is mid-typing and
 * every keystroke would otherwise spend one of the 20 calls a minute allowed.
 */
export const useEmailAccountCheck = (initialEmail: string) => {
  const [email, setEmail] = useState(initialEmail);
  const [emailCheck, setEmailCheck] = useState<EmailCheck | null>(null);
  const [failedCheck, setFailedCheck] = useState<FailedCheck | null>(null);
  /** The address the newest in-flight check was asked about. */
  const asked = useRef("");

  const { isPending: isChecking, mutate: checkAccount } = useMutation({
    mutationFn: (value: string) => client.auth.accountExists({ email: value }),
    onError: (error, value) => {
      // A superseded refusal is about an address no longer in the box: saying
      // it out loud would explain the wrong failure.
      if (value !== asked.current) {
        return;
      }
      const isRateLimited =
        error instanceof ORPCError && error.code === "TOO_MANY_REQUESTS";
      // The mode stays "unknown", so the refusal is both said out loud and
      // kept, which is what puts the way to ask again on the field.
      setFailedCheck({
        email: value,
        reason: isRateLimited ? "rate-limited" : "unavailable",
      });
      toast.error(
        isRateLimited
          ? m.auth_error_rate_limited()
          : m.auth_email_check_failed()
      );
    },
    onSuccess: (data, value) => {
      // A superseded check still runs its own callback, and letting an older
      // answer win would leave the form with no fields for the address in the
      // box and no way to ask again.
      if (value !== asked.current) {
        return;
      }
      setFailedCheck(null);
      setEmailCheck({ email: value, mode: data.exists ? "signin" : "signup" });
    },
  });

  const debouncedEmail = useDebouncedValue(email, EMAIL_CHECK_DELAY_MS);

  useEffect(() => {
    if (emailSchema.safeParse(debouncedEmail).success) {
      asked.current = debouncedEmail;
      checkAccount(debouncedEmail);
    }
  }, [debouncedEmail, checkAccount]);

  /**
   * The debounced value never re-emits an address it already emitted, so a
   * refused check is asked again by hand or not at all. Deliberately not
   * automatic: the refusal that actually happens is the shared rate limit, and
   * a retry loop would spend the next minute failing against a spent bucket.
   */
  const handleRetryCheck = () => {
    if (!emailSchema.safeParse(email).success) {
      return;
    }
    setFailedCheck(null);
    asked.current = email;
    checkAccount(email);
  };

  // Anything but the checked address is "unknown", so editing the email hides
  // the revealed fields again and a stale answer never unlocks the wrong ones.
  const mode: AccountMode =
    emailCheck === null || emailCheck.email !== email
      ? "unknown"
      : emailCheck.mode;

  // A check in flight supersedes the last refusal: the field shows the spinner
  // rather than a failure that is already being asked again.
  const checkFailure: CheckFailure | null =
    isChecking || failedCheck === null || failedCheck.email !== email
      ? null
      : failedCheck.reason;

  return {
    checkFailure,
    email,
    handleEmailChange: setEmail,
    handleRetryCheck,
    isChecking,
    mode,
  };
};

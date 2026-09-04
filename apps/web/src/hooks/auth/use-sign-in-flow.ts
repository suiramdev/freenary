import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import type { AuthOutcome } from "@/hooks/auth/use-auth-avatar";
import { authClient } from "@/lib/auth-client";
import type {
  AuthRequestError,
  PasswordBounds,
} from "@/lib/auth/auth-error-message";
import { authErrorMessage } from "@/lib/auth/auth-error-message";
import { m } from "@/paraglide/messages.js";

export type SignInStep =
  | "confirm"
  | "credentials"
  | "reset"
  | "reset-request"
  | "two-factor";

/** Which second factor the reader is being asked for. */
export type SecondFactor = "app" | "recovery";

/**
 * A refused WebAuthn ceremony is usually the reader dismissing the browser's
 * own prompt, which is a decision rather than a failure: `NotAllowedError`
 * arrives as the passthrough code and an aborted ceremony as its own.
 * `AUTH_CANCELLED` is deliberately absent — the passkey client uses it for any
 * non-`WebAuthnError` throw and for a failed `/passkey/verify-authentication`
 * round trip, neither of which the reader can explain to themselves. It only
 * stays out of this table because the unsupported browser, which throws a
 * plain `Error`, is turned away before the ceremony starts.
 */
const CANCELLED_PASSKEY_CODES = {
  ERROR_CEREMONY_ABORTED: true,
  ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY: true,
} satisfies Record<string, true>;

interface AuthAttempt<TData> {
  data: TData | null;
  error: AuthRequestError | null;
}

/**
 * better-auth rejects instead of answering when the request never reaches the
 * server — an offline browser, a dropped connection — which would otherwise
 * leave the pressed control spinning with nothing said. Status 0 is no HTTP
 * status at all, so it falls through to the generic message.
 */
const attempt = async <TData>(
  run: () => Promise<AuthAttempt<TData>>
): Promise<AuthAttempt<TData>> => {
  try {
    return await run();
  } catch {
    return { data: null, error: { status: 0 } };
  }
};

/**
 * The sign-in screen as an explicit step machine. Every better-auth call lives
 * here so the transitions read in one place; the step components only collect
 * input.
 */
/** Refusals that mean the server has nothing left to verify a code against. */
const SPENT_CHALLENGE_CODES = new Set([
  "INVALID_TWO_FACTOR_COOKIE",
  "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE",
]);

export const useSignInFlow = (passwordBounds: PasswordBounds | undefined) => {
  const navigate = useNavigate();
  const { refetch: refetchSession } = authClient.useSession();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<SignInStep>("credentials");
  const [secondFactor, setSecondFactor] = useState<SecondFactor>("app");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isPasskeyPending, setIsPasskeyPending] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AuthOutcome | null>(null);

  const settle = (kind: AuthOutcome["kind"]) => {
    setOutcome((previous) => ({ kind, seq: (previous?.seq ?? 0) + 1 }));
  };

  const refuse = (error: AuthRequestError) => {
    toast.error(authErrorMessage(error, passwordBounds));
    settle("error");
  };

  const finish = async (message: string) => {
    settle("success");
    // A session can also end without the Sign out button (expiry, or another
    // tab), so the incoming user is cleared of the previous one's cached
    // onboarding status and data here too.
    queryClient.clear();
    // The call settles before better-auth updates its session atom, and
    // AuthGate routes on that atom — leaving now bounces off /login.
    await refetchSession();
    await navigate({ to: "/" });
    toast.success(message);
  };

  const handleSignInSubmit = async (values: {
    email: string;
    password: string;
  }) => {
    setEmail(values.email);
    setIsSubmitting(true);
    const { data, error } = await attempt(() =>
      authClient.signIn.email(values)
    );
    setIsSubmitting(false);

    if (error) {
      refuse(error);
      // The password was right; the address just has not been confirmed, and
      // the server emailed a fresh code with its refusal — so the confirm step
      // is the way forward rather than a dead error.
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setStep("confirm");
      }
      return;
    }

    // No session yet: the password was right and a second factor is still owed.
    if (data !== null && "twoFactorRedirect" in data) {
      setSecondFactor("app");
      setStep("two-factor");
      return;
    }
    await finish(m.auth_signed_in_toast());
  };

  const handleSignUpSubmit = async (values: {
    email: string;
    name: string;
    password: string;
  }) => {
    setEmail(values.email);
    setIsSubmitting(true);
    const { data, error } = await attempt(() =>
      authClient.signUp.email(values)
    );
    setIsSubmitting(false);

    if (error) {
      refuse(error);
      return;
    }

    // With an email provider configured the server withholds the session until
    // the address is confirmed, so a missing token means a code is waiting.
    if ((data?.token ?? null) === null) {
      toast.success(m.auth_signup_code_sent_toast());
      setStep("confirm");
      return;
    }
    await finish(m.auth_account_created_toast());
  };

  const handleConfirmSubmit = async (otp: string) => {
    setIsSubmitting(true);
    // Confirming the address is also what creates the session.
    const { error } = await attempt(() =>
      authClient.emailOtp.verifyEmail({ email, otp })
    );
    setIsSubmitting(false);

    if (error) {
      refuse(error);
      return;
    }
    await finish(m.auth_verified_toast());
  };

  const handleResend = async () => {
    setIsResending(true);
    const { error } = await attempt(() =>
      step === "reset"
        ? authClient.emailOtp.requestPasswordReset({ email })
        : authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
          })
    );
    setIsResending(false);

    if (error) {
      refuse(error);
      return;
    }
    toast.success(m.auth_code_resent_toast());
  };

  const handleForgotPassword = (address: string) => {
    setEmail(address);
    setStep("reset-request");
  };

  const handleResetRequestSubmit = async (address: string) => {
    setEmail(address);
    setIsSubmitting(true);
    const { error } = await attempt(() =>
      authClient.emailOtp.requestPasswordReset({ email: address })
    );
    setIsSubmitting(false);

    if (error) {
      refuse(error);
      return;
    }
    setStep("reset");
  };

  const handleResetSubmit = async (values: {
    otp: string;
    password: string;
  }) => {
    setIsSubmitting(true);
    const { error } = await attempt(() =>
      authClient.emailOtp.resetPassword({
        email,
        otp: values.otp,
        password: values.password,
      })
    );
    setIsSubmitting(false);

    if (error) {
      refuse(error);
      return;
    }
    // Deliberately no session: whoever reset the password proves they hold it
    // by signing in with it.
    toast.success(m.auth_reset_success_toast());
    setStep("credentials");
  };

  const handleSecondFactorSubmit = async (values: {
    code: string;
    trustDevice: boolean;
  }) => {
    setIsSubmitting(true);
    const { error } = await attempt(() =>
      secondFactor === "recovery"
        ? authClient.twoFactor.verifyBackupCode(values)
        : authClient.twoFactor.verifyTotp(values)
    );
    setIsSubmitting(false);

    if (error) {
      refuse(error);
      // Either the 600 s two-factor cookie has lapsed or five wrong codes have
      // burned the challenge. Both leave nothing to verify against, so the
      // password itself has to be given again rather than another code.
      if (SPENT_CHALLENGE_CODES.has(error.code ?? "")) {
        setStep("credentials");
      }
      return;
    }
    await finish(m.auth_signed_in_toast());
  };

  const handleSecondFactorSwitch = () => {
    setSecondFactor(secondFactor === "app" ? "recovery" : "app");
  };

  const handlePasskeySelect = async () => {
    // The button is already gated on browser support, so this is the belt to
    // that brace: the unsupported ceremony throws a plain `Error`, which the
    // client reports as `AUTH_CANCELLED`, and this screen no longer suppresses
    // that code. Turning the case away here keeps a support problem from being
    // reported as a failure the reader cannot place.
    if (!("PublicKeyCredential" in window)) {
      toast.error(m.auth_error_passkey_unsupported());
      settle("error");
      return;
    }

    setIsPasskeyPending(true);
    // A passkey is a full sign-in on its own, never a second factor, so it
    // finishes exactly the way a password does.
    const { error } = await attempt(() => authClient.signIn.passkey());
    setIsPasskeyPending(false);

    if (error) {
      const isCancelled = Object.hasOwn(
        CANCELLED_PASSKEY_CODES,
        error.code ?? ""
      );
      if (!isCancelled) {
        toast.error(m.auth_error_passkey_failed());
        settle("error");
      }
      return;
    }
    await finish(m.auth_signed_in_toast());
  };

  const handleProviderSelect = async (provider: string) => {
    setPendingProvider(provider);
    const { error } = await attempt(() =>
      authClient.signIn.social({
        callbackURL: `${window.location.origin}/`,
        errorCallbackURL: `${window.location.origin}/login`,
        provider,
      })
    );

    // A successful call navigates away, so only a refusal ever reaches here.
    if (error) {
      setPendingProvider(null);
      refuse(error);
    }
  };

  return {
    email,
    goTo: setStep,
    handleConfirmSubmit,
    handleForgotPassword,
    handlePasskeySelect,
    handleProviderSelect,
    handleResend,
    handleResetRequestSubmit,
    handleResetSubmit,
    handleSecondFactorSubmit,
    handleSecondFactorSwitch,
    handleSignInSubmit,
    handleSignUpSubmit,
    isPasskeyPending,
    isResending,
    isSubmitting,
    outcome,
    pendingProvider,
    secondFactor,
    step,
  };
};

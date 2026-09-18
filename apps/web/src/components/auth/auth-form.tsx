import { BrandAvatar } from "@freenary/ui/components/brand-avatar";
import { spring } from "@freenary/ui/lib/springs";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { AuthConfirmStep } from "@/components/auth/auth-confirm-step";
import { AuthCredentialsStep } from "@/components/auth/auth-credentials-step";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthResetRequestStep } from "@/components/auth/auth-reset-request-step";
import { AuthResetStep } from "@/components/auth/auth-reset-step";
import { AuthTwoFactorStep } from "@/components/auth/auth-two-factor-step";
import { useAuthAvatar } from "@/hooks/auth/use-auth-avatar";
import { useSignInFlow } from "@/hooks/auth/use-sign-in-flow";
import type { SecondFactor, SignInStep } from "@/hooks/auth/use-sign-in-flow";
import type { AuthCapabilities } from "@/lib/auth/auth-capabilities";
import { m } from "@/paraglide/messages.js";

interface StepHeading {
  description: string;
  title: string;
}

interface StepHeadingContext {
  email: string;
  secondFactor: SecondFactor;
}

type StepHeadingResolver = (context: StepHeadingContext) => StepHeading;

interface AuthFormProps {
  capabilities: AuthCapabilities | undefined;
  isCapabilitiesError: boolean;
  onRetryCapabilities: () => void;
}

const STEP_EXIT_OFFSET = 12;

const HEADING_BY_STEP = {
  confirm: ({ email }) => ({
    description: m.auth_verify_description({ email }),
    title: m.auth_verify_title(),
  }),
  credentials: () => ({
    description: m.auth_welcome_description(),
    title: m.auth_welcome_title(),
  }),
  reset: ({ email }) => ({
    description: m.auth_reset_description({ email }),
    title: m.auth_reset_title(),
  }),
  "reset-request": () => ({
    description: m.auth_reset_request_description(),
    title: m.auth_reset_request_title(),
  }),
  "two-factor": ({ secondFactor }) => ({
    description:
      secondFactor === "recovery"
        ? m.auth_two_factor_recovery_description()
        : m.auth_two_factor_description(),
    title: m.auth_two_factor_title(),
  }),
} satisfies Record<SignInStep, StepHeadingResolver>;

export const AuthForm = ({
  capabilities,
  isCapabilitiesError,
  onRetryCapabilities,
}: AuthFormProps) => {
  const flow = useSignInFlow(capabilities);
  const prefersReducedMotion = useReducedMotion();

  const isAwaitingServer =
    flow.isSubmitting ||
    flow.isResending ||
    flow.isPasskeyPending ||
    flow.pendingProvider !== null;

  const avatar = useAuthAvatar({
    isBusy: isAwaitingServer,
    outcome: flow.outcome,
  });

  const heading = HEADING_BY_STEP[flow.step]({
    email: flow.email,
    secondFactor: flow.secondFactor,
  });

  return (
    <div {...avatar.handlers}>
      <BrandAvatar className="mb-6" size={56} state={avatar.state} />

      <AuthHeader description={heading.description} title={heading.title} />

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={flow.step}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            transition: prefersReducedMotion
              ? { duration: 0 }
              : spring.moderate.exit,
            y: STEP_EXIT_OFFSET,
          }}
          initial={{ opacity: 0, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : spring.moderate}
        >
          {flow.step === "credentials" && (
            <AuthCredentialsStep
              capabilities={capabilities}
              defaultEmail={flow.email}
              isCapabilitiesError={isCapabilitiesError}
              isPasskeyPending={flow.isPasskeyPending}
              isSubmitting={flow.isSubmitting}
              onForgotPassword={flow.handleForgotPassword}
              onPasskey={flow.handlePasskeySelect}
              onProvider={flow.handleProviderSelect}
              onRetryCapabilities={onRetryCapabilities}
              onSignIn={flow.handleSignInSubmit}
              onSignUp={flow.handleSignUpSubmit}
              pendingProvider={flow.pendingProvider}
            />
          )}

          {flow.step === "confirm" && (
            <AuthConfirmStep
              isResending={flow.isResending}
              isSubmitting={flow.isSubmitting}
              onBack={() => flow.goTo("credentials")}
              onResend={flow.handleResend}
              onSubmit={flow.handleConfirmSubmit}
              otpLength={capabilities?.otpLength}
            />
          )}

          {flow.step === "reset-request" && (
            <AuthResetRequestStep
              defaultEmail={flow.email}
              isSubmitting={flow.isSubmitting}
              onBack={() => flow.goTo("credentials")}
              onSubmit={flow.handleResetRequestSubmit}
            />
          )}

          {flow.step === "reset" && (
            <AuthResetStep
              isResending={flow.isResending}
              isSubmitting={flow.isSubmitting}
              minPasswordLength={capabilities?.minPasswordLength}
              onBack={() => flow.goTo("credentials")}
              onResend={flow.handleResend}
              onSubmit={flow.handleResetSubmit}
              otpLength={capabilities?.otpLength}
            />
          )}

          {flow.step === "two-factor" && (
            <AuthTwoFactorStep
              isSubmitting={flow.isSubmitting}
              method={flow.secondFactor}
              onBack={() => flow.goTo("credentials")}
              onMethodSwitch={flow.handleSecondFactorSwitch}
              onSubmit={flow.handleSecondFactorSubmit}
              trustedDeviceDays={capabilities?.trustedDeviceDays}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

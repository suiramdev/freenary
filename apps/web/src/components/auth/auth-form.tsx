import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { AuthConfirmStep } from "@/components/auth/auth-confirm-step";
import { AuthCredentialsStep } from "@/components/auth/auth-credentials-step";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthResetRequestStep } from "@/components/auth/auth-reset-request-step";
import { AuthResetStep } from "@/components/auth/auth-reset-step";
import { AuthTwoFactorStep } from "@/components/auth/auth-two-factor-step";
import { useSignInFlow } from "@/hooks/auth/use-sign-in-flow";
import type { SecondFactor, SignInStep } from "@/hooks/auth/use-sign-in-flow";
import type { AuthCapabilities } from "@/lib/auth/auth-capabilities";
import { m } from "@/paraglide/messages.js";

const STEP_EASE = [0.23, 1, 0.32, 1] as const;
/** How far the leaving step drops: a hint of direction, never its own height. */
const STEP_EXIT_OFFSET = 12;

const enterTransition = { duration: 0.2, ease: STEP_EASE };
const exitTransition = { duration: 0.15, ease: "easeOut" as const };
const reducedTransition = { duration: 0 };

interface StepHeading {
  description: string;
  title: string;
}

const stepHeading = (
  step: SignInStep,
  email: string,
  secondFactor: SecondFactor
): StepHeading => {
  switch (step) {
    case "confirm": {
      return {
        description: m.auth_verify_description({ email }),
        title: m.auth_verify_title(),
      };
    }
    case "reset-request": {
      return {
        description: m.auth_reset_request_description(),
        title: m.auth_reset_request_title(),
      };
    }
    case "reset": {
      return {
        description: m.auth_reset_description({ email }),
        title: m.auth_reset_title(),
      };
    }
    case "two-factor": {
      return {
        description:
          secondFactor === "recovery"
            ? m.auth_two_factor_recovery_description()
            : m.auth_two_factor_description(),
        title: m.auth_two_factor_title(),
      };
    }
    default: {
      return {
        description: m.auth_welcome_description(),
        title: m.auth_welcome_title(),
      };
    }
  }
};

interface AuthFormProps {
  capabilities: AuthCapabilities | undefined;
  isCapabilitiesError: boolean;
  onRetryCapabilities: () => void;
}

export const AuthForm = ({
  capabilities,
  isCapabilitiesError,
  onRetryCapabilities,
}: AuthFormProps) => {
  // The flow reports the server's own password bounds in its refusals, so it is
  // given the deployment's answer rather than a number of this screen's own.
  const flow = useSignInFlow(capabilities);
  const prefersReducedMotion = useReducedMotion();

  const heading = stepHeading(flow.step, flow.email, flow.secondFactor);

  return (
    <div>
      {/* The heading is outside the animated body: it names the step, so it is
          the static cue that stays readable while the body cross-fades. */}
      <AuthHeader description={heading.description} title={heading.title} />

      {/* A step replaces the whole body rather than revealing part of it, so
          the two states cross-fade in sequence: nothing moves but the leaving
          step, which drops a little on its way out. `initial={false}` keeps the
          server-rendered first step opaque. */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={flow.step}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            transition: prefersReducedMotion
              ? reducedTransition
              : exitTransition,
            y: STEP_EXIT_OFFSET,
          }}
          initial={{ opacity: 0, y: 0 }}
          transition={
            prefersReducedMotion ? reducedTransition : enterTransition
          }
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

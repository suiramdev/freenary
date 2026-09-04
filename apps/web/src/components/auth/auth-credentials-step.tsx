import { Button } from "@freenary/ui/components/button";
import { Field, FieldGroup } from "@freenary/ui/components/field";
import { InputGroupButton } from "@freenary/ui/components/input-group";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiRefreshLine } from "@remixicon/react";
import { useForm } from "@tanstack/react-form";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { z } from "zod";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { AuthSignInOptions } from "@/components/auth/auth-sign-in-options";
import { useEmailAccountCheck } from "@/hooks/auth/use-email-account-check";
import type { AccountMode } from "@/hooks/auth/use-email-account-check";
import type { AuthCapabilities } from "@/lib/auth/auth-capabilities";
import { emailField, passwordField } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

const NAME_MIN_LENGTH = 2;

const REVEAL_SPRING = { bounce: 0, duration: 0.3, type: "spring" as const };
const REVEAL_EASE = [0.23, 1, 0.32, 1] as const;

const revealTransition = {
  height: REVEAL_SPRING,
  opacity: { duration: 0.2, ease: REVEAL_EASE },
};
const collapseTransition = {
  height: REVEAL_SPRING,
  opacity: { duration: 0.12, ease: REVEAL_EASE },
};
const reducedTransition = {
  height: { duration: 0 },
  opacity: { duration: 0.15, ease: REVEAL_EASE },
};

// Built per call rather than once per module: a module-level schema would
// freeze its messages in whichever locale rendered first, and on the server
// that locale belongs to one request while the schema is shared by all of them.
const credentialsSchema = (
  mode: AccountMode,
  minPasswordLength: number | undefined
) => {
  // Nothing but the address is asked for yet, so pressing Enter early must not
  // leave errors behind under a collapsed block.
  if (mode === "unknown") {
    return z.object({
      email: emailField(),
      name: z.string(),
      password: z.string(),
    });
  }

  return z.object({
    email: emailField(),
    name:
      mode === "signup"
        ? z.string().min(NAME_MIN_LENGTH, m.auth_error_name_too_short())
        : z.string(),
    // A floor applies to a password being chosen, never to one being entered.
    password: passwordField(mode === "signup" ? minPasswordLength : undefined),
  });
};

interface AuthCredentialsStepProps {
  capabilities: AuthCapabilities | undefined;
  /** The address already in play, so coming back does not blank the field. */
  defaultEmail: string;
  /** Passed through: the options below the form name a failure only when they
   * have no answer at all, never over one already held. */
  isCapabilitiesError: boolean;
  isPasskeyPending: boolean;
  isSubmitting: boolean;
  onForgotPassword: (email: string) => void;
  onPasskey: () => void;
  onProvider: (provider: string) => void;
  onRetryCapabilities: () => void;
  onSignIn: (values: { email: string; password: string }) => Promise<void>;
  onSignUp: (values: {
    email: string;
    name: string;
    password: string;
  }) => Promise<void>;
  pendingProvider: string | null;
}

export const AuthCredentialsStep = ({
  capabilities,
  defaultEmail,
  isCapabilitiesError,
  isPasskeyPending,
  isSubmitting,
  onForgotPassword,
  onPasskey,
  onProvider,
  onRetryCapabilities,
  onSignIn,
  onSignUp,
  pendingProvider,
}: AuthCredentialsStepProps) => {
  const {
    checkFailure,
    email,
    handleEmailChange,
    handleRetryCheck,
    isChecking,
    mode,
  } = useEmailAccountCheck(defaultEmail);
  const prefersReducedMotion = useReducedMotion();

  const schema = useMemo(
    () => credentialsSchema(mode, capabilities?.minPasswordLength),
    [mode, capabilities?.minPasswordLength]
  );

  const form = useForm({
    defaultValues: { email: defaultEmail, name: "", password: "" },
    onSubmit: ({ value }) => {
      if (mode === "unknown") {
        return;
      }
      return mode === "signin"
        ? onSignIn({ email: value.email, password: value.password })
        : onSignUp(value);
    },
    validators: { onSubmit: schema },
  });

  const isSignUp = mode === "signup";

  // The check's spinner and the way to ask it again share the field's trailing
  // slot: that is where the reader is already looking for the answer, and a
  // refused check is what leaves the rest of the form collapsed.
  const renderEmailAdornment = () => {
    if (isChecking) {
      return <Spinner />;
    }
    if (checkFailure === null) {
      return null;
    }
    return (
      <InputGroupButton
        aria-label={m.auth_email_check_retry()}
        size="icon-xs"
        onClick={handleRetryCheck}
      >
        <RiRefreshLine aria-hidden="true" />
      </InputGroupButton>
    );
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field name="email">
            {(field) => (
              <AuthFormField
                autoComplete="email"
                autoFocus
                endAdornment={renderEmailAdornment()}
                errors={field.state.meta.errors.map((error) => error?.message)}
                id={field.name}
                label={m.auth_email_label()}
                placeholder={m.auth_email_placeholder()}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(value) => {
                  field.handleChange(value);
                  handleEmailChange(value);
                }}
              />
            )}
          </form.Field>

          {/* Without an answer the block below stays collapsed, so the field
              says so: the reader would otherwise see an email box, no submit
              button, and no reason for either. */}
          {checkFailure !== null && (
            <output className="text-muted-foreground text-sm">
              {checkFailure === "rate-limited"
                ? m.auth_email_check_blocked_rate_limited()
                : m.auth_email_check_blocked_unavailable()}
            </output>
          )}
        </FieldGroup>

        {/* Editing the email drops the mode back to "unknown", so this block is
            revealed and collapsed repeatedly — it animates with transitions
            that retarget mid-flight rather than keyframes that restart, and it
            is deliberately not staggered. */}
        <AnimatePresence initial={false}>
          {mode !== "unknown" && (
            <motion.div
              key="credentials"
              // Clipped from the first frame rather than by a class raced
              // against the animation. The inputs' focus ring paints outside
              // their box, so the clip is pushed out by the wrapper's own
              // padding and pulled back by the matching negative margin, which
              // keeps the fields aligned with the email field above.
              className="-mx-1 overflow-hidden px-1"
              animate={{ height: "auto", opacity: 1 }}
              exit={{
                height: 0,
                opacity: 0,
                transition: prefersReducedMotion
                  ? reducedTransition
                  : collapseTransition,
              }}
              initial={{ height: 0, opacity: 0 }}
              transition={
                prefersReducedMotion ? reducedTransition : revealTransition
              }
            >
              {/* The gap lives inside the reveal so no empty row is left
                  behind while the block is collapsed; the bottom padding gives
                  the last control's focus ring the same room. */}
              <FieldGroup className="pt-4 pb-1">
                {isSignUp && (
                  <form.Field name="name">
                    {(field) => (
                      <AuthFormField
                        autoComplete="name"
                        errors={field.state.meta.errors.map(
                          (error) => error?.message
                        )}
                        id={field.name}
                        label={m.auth_name_label()}
                        placeholder={m.auth_name_placeholder()}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.Field>
                )}

                <form.Field name="password">
                  {(field) => (
                    <AuthFormField
                      autoComplete={
                        isSignUp ? "new-password" : "current-password"
                      }
                      errors={field.state.meta.errors.map(
                        (error) => error?.message
                      )}
                      id={field.name}
                      label={m.auth_password_label()}
                      placeholder={m.auth_password_placeholder()}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                    />
                  )}
                </form.Field>

                <Field>
                  <Button disabled={isSubmitting} type="submit">
                    {isSubmitting && <Spinner data-icon="inline-start" />}
                    {isSignUp
                      ? m.auth_sign_up_submit()
                      : m.auth_sign_in_submit()}
                  </Button>
                </Field>

                {/* Resetting a password is an email away, so without an email
                    provider there is nothing to offer here. */}
                {!isSignUp && capabilities?.emailDelivery && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => onForgotPassword(email)}
                    >
                      {m.auth_forgot_password()}
                    </Button>
                  </div>
                )}
              </FieldGroup>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The reveal is the whole interaction, and focus deliberately stays in
            the email field — so what the form now asks for is said rather than
            left to be re-explored. */}
        {mode !== "unknown" && (
          <output className="sr-only">
            {isSignUp ? m.auth_reveal_sign_up() : m.auth_reveal_sign_in()}
          </output>
        )}
      </form>

      <AuthSignInOptions
        capabilities={capabilities}
        isError={isCapabilitiesError}
        isPasskeyPending={isPasskeyPending}
        onPasskey={onPasskey}
        onProvider={onProvider}
        onRetry={onRetryCapabilities}
        pendingProvider={pendingProvider}
      />
    </div>
  );
};

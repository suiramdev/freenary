import { Button } from "@freenary/ui/components/button";
import { Field, FieldGroup } from "@freenary/ui/components/field";
import { Spinner } from "@freenary/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";
import { z } from "zod";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { otpField, passwordField } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

interface AuthResetStepProps {
  isResending: boolean;
  isSubmitting: boolean;
  /** The server's own floor, so the field never promises a length it rejects. */
  minPasswordLength: number | undefined;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (values: { otp: string; password: string }) => Promise<void>;
  /** The server's own length. While it is unknown the field neither caps the
   * input nor names a number, so an outage cannot refuse a valid code. */
  otpLength: number | undefined;
}

export const AuthResetStep = ({
  isResending,
  isSubmitting,
  minPasswordLength,
  onBack,
  onResend,
  onSubmit,
  otpLength,
}: AuthResetStepProps) => {
  const schema = useMemo(
    () =>
      z.object({
        otp: otpField(otpLength),
        password: passwordField(minPasswordLength),
      }),
    [minPasswordLength, otpLength]
  );

  const form = useForm({
    defaultValues: { otp: "", password: "" },
    onSubmit: ({ value }) => onSubmit(value),
    validators: { onSubmit: schema },
  });

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
          <form.Field name="otp">
            {(field) => (
              <AuthFormField
                autoComplete="one-time-code"
                autoFocus
                errors={field.state.meta.errors.map((error) => error?.message)}
                id={field.name}
                inputMode="numeric"
                label={m.auth_code_label()}
                maxLength={otpLength}
                placeholder={m.auth_code_placeholder()}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <AuthFormField
                autoComplete="new-password"
                errors={field.state.meta.errors.map((error) => error?.message)}
                id={field.name}
                label={m.auth_new_password_label()}
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
              {m.auth_reset_submit()}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div className="mt-2 flex flex-col items-center">
        <Button
          disabled={isResending}
          type="button"
          variant="link"
          onClick={onResend}
        >
          {isResending && <Spinner data-icon="inline-start" />}
          {m.auth_code_resend()}
        </Button>
        <Button type="button" variant="link" onClick={onBack}>
          {m.auth_back_to_sign_in()}
        </Button>
      </div>
    </div>
  );
};

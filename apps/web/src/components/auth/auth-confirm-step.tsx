import { Button } from "@freenary/ui/components/button";
import { Field, FieldGroup } from "@freenary/ui/components/field";
import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";
import { z } from "zod";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { otpField } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

interface AuthConfirmStepProps {
  isResending: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (otp: string) => Promise<void>;
  otpLength: number | undefined;
}

export const AuthConfirmStep = ({
  isResending,
  isSubmitting,
  onBack,
  onResend,
  onSubmit,
  otpLength,
}: AuthConfirmStepProps) => {
  const schema = useMemo(
    () => z.object({ otp: otpField(otpLength) }),
    [otpLength]
  );

  const form = useForm({
    defaultValues: { otp: "" },
    onSubmit: ({ value }) => onSubmit(value.otp),
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

          <Field>
            <Button loading={isSubmitting} type="submit">
              {m.auth_verify_submit()}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div className="mt-2 flex flex-col items-center">
        <Button
          loading={isResending}
          type="button"
          variant="ghost"
          onClick={onResend}
        >
          {m.auth_code_resend()}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {m.auth_use_different_email()}
        </Button>
      </div>
    </div>
  );
};

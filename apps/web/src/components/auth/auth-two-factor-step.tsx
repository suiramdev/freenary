import { Button } from "@freenary/ui/components/button";
import { Checkbox } from "@freenary/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@freenary/ui/components/field";
import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { z } from "zod";

import { AuthFormField } from "@/components/auth/auth-form-field";
import type { SecondFactor } from "@/hooks/auth/use-sign-in-flow";
import { TOTP_CODE_LENGTH, TOTP_CODE_PATTERN } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

interface AuthTwoFactorStepProps {
  isSubmitting: boolean;
  method: SecondFactor;
  onBack: () => void;
  onMethodSwitch: () => void;
  onSubmit: (values: { code: string; trustDevice: boolean }) => Promise<void>;
  trustedDeviceDays: number | undefined;
}

const TRUST_DEVICE_ID = "auth-trust-device";

export const AuthTwoFactorStep = ({
  isSubmitting,
  method,
  onBack,
  onMethodSwitch,
  onSubmit,
  trustedDeviceDays,
}: AuthTwoFactorStepProps) => {
  const [trustDevice, setTrustDevice] = useState(false);
  const isApp = method === "app";

  const schema = useMemo(
    () =>
      z.object({
        code: isApp
          ? z
              .string()
              .trim()
              .regex(
                TOTP_CODE_PATTERN,
                m.auth_error_code_length({ count: TOTP_CODE_LENGTH })
              )
          : z.string().trim().min(1, m.auth_error_recovery_code_required()),
      }),
    [isApp]
  );

  const form = useForm({
    defaultValues: { code: "" },
    onSubmit: ({ value }) => onSubmit({ code: value.code.trim(), trustDevice }),
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
          <form.Field name="code">
            {(field) => (
              <AuthFormField
                key={method}
                autoComplete={isApp ? "one-time-code" : "off"}
                autoFocus
                errors={field.state.meta.errors.map((error) => error?.message)}
                id={field.name}
                inputMode={isApp ? "numeric" : "text"}
                label={
                  isApp
                    ? m.auth_two_factor_code_label()
                    : m.auth_two_factor_recovery_label()
                }
                maxLength={isApp ? TOTP_CODE_LENGTH : undefined}
                placeholder={
                  isApp
                    ? m.auth_code_placeholder()
                    : m.auth_two_factor_recovery_placeholder()
                }
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          {trustedDeviceDays !== undefined && (
            <Field orientation="horizontal">
              <Checkbox
                checked={trustDevice}
                id={TRUST_DEVICE_ID}
                onCheckedChange={(checked) => setTrustDevice(checked)}
              />
              <FieldContent>
                <FieldLabel htmlFor={TRUST_DEVICE_ID}>
                  {m.auth_two_factor_trust_device({ count: trustedDeviceDays })}
                </FieldLabel>
                <FieldDescription>
                  {m.auth_two_factor_trust_device_hint()}
                </FieldDescription>
              </FieldContent>
            </Field>
          )}

          <Field>
            <Button loading={isSubmitting} type="submit">
              {m.auth_code_submit()}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div className="mt-2 flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            form.reset();
            onMethodSwitch();
          }}
        >
          {isApp
            ? m.auth_two_factor_use_recovery()
            : m.auth_two_factor_use_app()}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {m.auth_back_to_sign_in()}
        </Button>
      </div>
    </div>
  );
};

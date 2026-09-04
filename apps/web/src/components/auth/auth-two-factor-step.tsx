import { Button } from "@freenary/ui/components/button";
import { Checkbox } from "@freenary/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@freenary/ui/components/field";
import { Spinner } from "@freenary/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { z } from "zod";

import { AuthFormField } from "@/components/auth/auth-form-field";
import type { SecondFactor } from "@/hooks/auth/use-sign-in-flow";
import { TOTP_CODE_LENGTH, TOTP_CODE_PATTERN } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

const TRUST_DEVICE_ID = "auth-trust-device";

interface AuthTwoFactorStepProps {
  isSubmitting: boolean;
  /** Which factor is being asked for; the panel heading follows it too. */
  method: SecondFactor;
  onBack: () => void;
  onMethodSwitch: () => void;
  onSubmit: (values: { code: string; trustDevice: boolean }) => Promise<void>;
  /** From the server, so the label cannot name a window it does not enforce. */
  trustedDeviceDays: number | undefined;
}

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
        // Trimmed and digit-checked like the enrolment field: a pasted
        // "123 456" must not be refused here and accepted there, and six
        // non-digits must not spend part of the account's lockout budget.
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
              // Keyed by method so switching remounts the input: the reader
              // lands in the field they just asked for.
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

          {/* Outside the keyed field, so switching to a recovery code keeps the
              choice: it is about this browser, not about which code is used.
              Absent until the server states the window, rather than naming a
              number this screen invented. */}
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
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {m.auth_code_submit()}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {/* The two-factor cookie lapses after ten minutes, so the way out of
          this step is a control rather than a page reload. */}
      <div className="mt-2 flex flex-col items-center">
        <Button
          type="button"
          variant="link"
          onClick={() => {
            form.reset();
            onMethodSwitch();
          }}
        >
          {isApp
            ? m.auth_two_factor_use_recovery()
            : m.auth_two_factor_use_app()}
        </Button>
        <Button type="button" variant="link" onClick={onBack}>
          {m.auth_back_to_sign_in()}
        </Button>
      </div>
    </div>
  );
};

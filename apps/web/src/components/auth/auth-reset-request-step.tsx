import { Button } from "@freenary/ui/components/button";
import { Field, FieldGroup } from "@freenary/ui/components/field";
import { Spinner } from "@freenary/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";
import { z } from "zod";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { emailField } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

interface AuthResetRequestStepProps {
  defaultEmail: string;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (email: string) => Promise<void>;
}

export const AuthResetRequestStep = ({
  defaultEmail,
  isSubmitting,
  onBack,
  onSubmit,
}: AuthResetRequestStepProps) => {
  const schema = useMemo(() => z.object({ email: emailField() }), []);

  const form = useForm({
    defaultValues: { email: defaultEmail },
    onSubmit: ({ value }) => onSubmit(value.email),
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
          <form.Field name="email">
            {(field) => (
              <AuthFormField
                autoComplete="email"
                autoFocus
                errors={field.state.meta.errors.map((error) => error?.message)}
                id={field.name}
                label={m.auth_email_label()}
                placeholder={m.auth_email_placeholder()}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          <Field>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {m.auth_reset_request_submit()}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div className="mt-2 flex justify-center">
        <Button type="button" variant="link" onClick={onBack}>
          {m.auth_back_to_sign_in()}
        </Button>
      </div>
    </div>
  );
};

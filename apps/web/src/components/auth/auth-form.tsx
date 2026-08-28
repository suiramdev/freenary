import { Button } from "@freenary/ui/components/button";
import { Field, FieldGroup } from "@freenary/ui/components/field";
import { Spinner } from "@freenary/ui/components/spinner";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { AuthHeader } from "@/components/auth/auth-header";
import { useAuthForm } from "@/hooks/auth/use-auth-form";

export const AuthForm = () => {
  const { form, isCheckingEmail, isSubmitting, mode, onEmailChange } =
    useAuthForm();

  return (
    <div>
      <AuthHeader />

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
                endAdornment={isCheckingEmail && <Spinner />}
                errors={field.state.meta.errors.map((error) => error?.message)}
                id={field.name}
                label="Email"
                placeholder="you@example.com"
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(value) => {
                  field.handleChange(value);
                  onEmailChange(value);
                }}
              />
            )}
          </form.Field>

          {mode === "signup" && (
            <form.Field name="name">
              {(field) => (
                <AuthFormField
                  errors={field.state.meta.errors.map(
                    (error) => error?.message
                  )}
                  id={field.name}
                  label="Name"
                  placeholder="Your name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          )}

          {mode !== "unknown" && (
            <form.Field name="password">
              {(field) => (
                <AuthFormField
                  errors={field.state.meta.errors.map(
                    (error) => error?.message
                  )}
                  id={field.name}
                  label="Password"
                  placeholder="••••••••"
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          )}

          {mode !== "unknown" && (
            <Field>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {mode === "signin" ? "Sign In" : "Create account"}
              </Button>
            </Field>
          )}
        </FieldGroup>
      </form>
    </div>
  );
};

import { Button } from "@freenary/ui/components/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";

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
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => (
            <AuthFormField
              endAdornment={
                isCheckingEmail && (
                  <SpinnerGapIcon className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
                )
              }
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
                errors={field.state.meta.errors.map((error) => error?.message)}
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
                errors={field.state.meta.errors.map((error) => error?.message)}
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
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting && (
              <SpinnerGapIcon className="mr-2 size-4 animate-spin" />
            )}
            {mode === "signin" ? "Sign In" : "Create account"}
          </Button>
        )}
      </form>
    </div>
  );
};

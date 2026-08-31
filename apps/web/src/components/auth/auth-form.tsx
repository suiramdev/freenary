import { Button } from "@freenary/ui/components/button";
import { Field, FieldGroup } from "@freenary/ui/components/field";
import { Spinner } from "@freenary/ui/components/spinner";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { AuthHeader } from "@/components/auth/auth-header";
import { useAuthForm } from "@/hooks/auth/use-auth-form";

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

export const AuthForm = () => {
  const { form, isCheckingEmail, isSubmitting, mode, onEmailChange } =
    useAuthForm();
  const prefersReducedMotion = useReducedMotion();

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
        </FieldGroup>

        {/* Editing the email drops the mode back to "unknown", so this block is
            revealed and collapsed repeatedly — it animates with transitions
            that retarget mid-flight rather than keyframes that restart. */}
        <AnimatePresence initial={false}>
          {mode !== "unknown" && (
            <motion.div
              key="credentials"
              // Clip only while the height animates: the input's focus ring
              // sits outside the box and a permanent clip would cut it off.
              animate={{
                height: "auto",
                opacity: 1,
                transitionEnd: { overflow: "visible" },
              }}
              exit={{
                height: 0,
                opacity: 0,
                overflow: "hidden",
                transition: prefersReducedMotion
                  ? reducedTransition
                  : collapseTransition,
              }}
              initial={{ height: 0, opacity: 0, overflow: "hidden" }}
              transition={
                prefersReducedMotion ? reducedTransition : revealTransition
              }
            >
              {/* The gap lives inside the reveal so no empty row is left
                  behind while the block is collapsed. */}
              <FieldGroup className="pt-4">
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

                <Field>
                  <Button disabled={isSubmitting} type="submit">
                    {isSubmitting && <Spinner data-icon="inline-start" />}
                    {mode === "signin" ? "Sign In" : "Create account"}
                  </Button>
                </Field>
              </FieldGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};

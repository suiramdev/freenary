import { Button } from "@freenary/ui/components/button";
import { Input } from "@freenary/ui/components/input";
import { Label } from "@freenary/ui/components/label";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

import { AuthHeader } from "./auth-header";

type Mode = "unknown" | "signin" | "signup";

export const AuthForm = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkEmail = useMutation({
    mutationFn: (email: string) => client.onboarding.checkEmail({ email }),
    onSuccess: (data) => {
      setMode(data.exists ? "signin" : "signup");
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        if (mode === "signin") {
          await authClient.signIn.email(
            { email: value.email, password: value.password },
            {
              onError: (error) => {
                toast.error(error.error.message || error.error.statusText);
              },
              onSuccess: () => {
                navigate({ to: "/dashboard" });
                toast.success("Signed in successfully");
              },
            }
          );
        } else if (mode === "signup") {
          await authClient.signUp.email(
            {
              email: value.email,
              name: value.name,
              password: value.password,
            },
            {
              onError: (error) => {
                toast.error(error.error.message || error.error.statusText);
              },
              onSuccess: () => {
                navigate({ to: "/dashboard" });
                toast.success("Account created successfully");
              },
            }
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    validators: {
      onSubmit:
        mode === "signup"
          ? z.object({
              email: z.email("Invalid email address"),
              name: z.string().min(2, "Name must be at least 2 characters"),
              password: z
                .string()
                .min(8, "Password must be at least 8 characters"),
            })
          : z.object({
              email: z.email("Invalid email address"),
              name: z.string(),
              password: z
                .string()
                .min(8, "Password must be at least 8 characters"),
            }),
    },
  });

  const handleEmailChange = (email: string) => {
    clearTimeout(debounceRef.current ?? undefined);

    // Reset mode when email changes
    setMode("unknown");

    debounceRef.current = setTimeout(() => {
      const result = z.email().safeParse(email);
      if (result.success) {
        checkEmail.mutate(email);
      }
    }, 500);
  };

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
            <div className="space-y-2">
              <Label htmlFor={field.name}>Email</Label>
              <div className="relative">
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="you@example.com"
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    handleEmailChange(e.target.value);
                  }}
                />
                {checkEmail.isPending && (
                  <SpinnerGapIcon className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
                )}
              </div>
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-destructive text-xs">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        {mode === "signup" && (
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Your name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        )}

        {mode !== "unknown" && (
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="••••••••"
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
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

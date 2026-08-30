import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

const EMAIL_CHECK_DELAY_MS = 500;

const emailSchema = z.email();

const signInSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signUpSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Mode = "unknown" | "signin" | "signup";

/** Answer of the last completed existence check, kept next to the address it
 * answered for. */
interface EmailCheck {
  email: string;
  mode: "signin" | "signup";
}

export const useAuthForm = () => {
  const navigate = useNavigate();
  const { refetch: refetchSession } = authClient.useSession();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [emailCheck, setEmailCheck] = useState<EmailCheck | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isPending: isCheckingEmail, mutate: mutateCheckEmail } = useMutation({
    mutationFn: (value: string) =>
      client.onboarding.checkEmail({ email: value }),
    onSuccess: (data, value) => {
      setEmailCheck({ email: value, mode: data.exists ? "signin" : "signup" });
    },
  });

  const debouncedEmail = useDebouncedValue(email, EMAIL_CHECK_DELAY_MS);

  useEffect(() => {
    if (emailSchema.safeParse(debouncedEmail).success) {
      mutateCheckEmail(debouncedEmail);
    }
  }, [debouncedEmail, mutateCheckEmail]);

  // Anything but the checked address is "unknown", so editing the email hides
  // the password field again and a stale answer never unlocks the wrong fields.
  const mode: Mode =
    emailCheck === null || emailCheck.email !== email
      ? "unknown"
      : emailCheck.mode;

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      if (mode === "signin") {
        await authClient.signIn.email(
          { email: value.email, password: value.password },
          {
            onError: (error) => {
              toast.error(error.error.message || error.error.statusText);
            },
            // signIn settles before better-auth updates its session atom, and
            // AuthGate routes on that atom — leaving now bounces off /login.
            onSuccess: async () => {
              // A session can also end without the Sign out button (expiry, or
              // another tab), so the incoming user is cleared of the previous
              // one's cached onboarding status and data here too.
              queryClient.clear();
              await refetchSession();
              await navigate({ to: "/" });
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
            onSuccess: async () => {
              queryClient.clear();
              await refetchSession();
              await navigate({ to: "/" });
              toast.success("Account created successfully");
            },
          }
        );
      }
      setIsSubmitting(false);
    },
    validators: {
      onSubmit: mode === "signup" ? signUpSchema : signInSchema,
    },
  });

  return {
    form,
    isCheckingEmail,
    isSubmitting,
    mode,
    onEmailChange: setEmail,
  };
};

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages.js";
import { client } from "@/utils/orpc";

const EMAIL_CHECK_DELAY_MS = 500;

const emailSchema = z.email();

type Mode = "unknown" | "signup" | "signin";

// Built per mount rather than once per module: a module-level schema would
// freeze its messages in whichever locale rendered first, and on the server
// that locale belongs to one request but the schema is shared by all of them.
// Switching locale reloads the document, so a mount is a fresh locale.
const credentialsSchema = (mode: Mode) =>
  z.object({
    email: z.email(m.auth_error_invalid_email()),
    name:
      mode === "signup"
        ? z.string().min(2, m.auth_error_name_too_short())
        : z.string(),
    password: z.string().min(8, m.auth_error_password_too_short()),
  });

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

  const schema = useMemo(() => credentialsSchema(mode), [mode]);

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
              toast.success(m.auth_signed_in_toast());
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
              toast.success(m.auth_account_created_toast());
            },
          }
        );
      }
      setIsSubmitting(false);
    },
    validators: {
      onSubmit: schema,
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

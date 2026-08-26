import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthPanel } from "@/components/auth/auth-panel";
import { authClient } from "@/lib/auth-client";

const LoginPage = () => (
  <AuthPanel>
    <AuthForm />
  </AuthPanel>
);

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

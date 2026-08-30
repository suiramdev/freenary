import { createFileRoute } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthGate } from "@/components/auth/auth-gate";
import { AuthPanel } from "@/components/auth/auth-panel";

const LoginPage = () => (
  <AuthGate audience="guest">
    <AuthPanel>
      <AuthForm />
    </AuthPanel>
  </AuthGate>
);

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

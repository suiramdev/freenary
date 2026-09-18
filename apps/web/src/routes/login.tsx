import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { z } from "zod";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthGate } from "@/components/auth/auth-gate";
import { AuthPanel } from "@/components/auth/auth-panel";
import { useOauthCallbackError } from "@/hooks/auth/use-oauth-callback-error";
import { orpc } from "@/utils/orpc";

const loginSearchSchema = z.object({ error: z.string().optional() });

const LoginPage = () => {
  const capabilities = useQuery(orpc.auth.capabilities.queryOptions());
  const { error } = useSearch({ from: "/login" });
  const navigate = useNavigate();

  useOauthCallbackError(error, () => {
    void navigate({ replace: true, search: {}, to: "/login" });
  });

  return (
    <AuthGate audience="guest">
      <AuthPanel>
        <AuthForm
          capabilities={capabilities.data}
          isCapabilitiesError={capabilities.isError}
          onRetryCapabilities={() => {
            void capabilities.refetch();
          }}
        />
      </AuthPanel>
    </AuthGate>
  );
};

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context: { viewer } }) => {
    if (viewer.kind === "member") {
      throw redirect({ to: viewer.onboarded ? "/" : "/onboarding" });
    }
  },
  component: LoginPage,
  validateSearch: loginSearchSchema,
});

import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { AuthGate } from "@/features/auth-gate";
import { orpc } from "@/shared/api";
import { useOauthCallbackError } from "@/shared/auth";

import { AuthForm } from "./auth-form";
import { AuthPanel } from "./auth-panel";

export const LoginPage = () => {
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

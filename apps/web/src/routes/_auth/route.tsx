import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import Header from "@/components/header";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

const AuthLayout = () => (
  <div className="grid h-svh grid-rows-[auto_1fr]">
    <Header />
    <Outlet />
  </div>
);

export const Route = createFileRoute("/_auth")({
  ssr: false,
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    const status = await client.onboarding.getStatus();
    if (!status.completed) {
      throw redirect({ to: "/onboarding" });
    }

    return { session };
  },
});

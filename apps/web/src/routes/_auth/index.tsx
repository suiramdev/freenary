import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

const DashboardPage = () => {
  // AuthGate only renders this once the session has resolved.
  const { data: session } = authClient.useSession();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">
        Welcome back, {session?.user.name}
      </h1>
    </div>
  );
};

export const Route = createFileRoute("/_auth/")({
  component: DashboardPage,
});

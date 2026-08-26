import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/")({
  component: DashboardPage,
});

// eslint-disable-next-line no-use-before-define -- TanStack Router pattern: Route references component defined below
function DashboardPage() {
  const { session } = Route.useRouteContext();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">
        Welcome back, {session.data?.user.name}
      </h1>
    </div>
  );
}

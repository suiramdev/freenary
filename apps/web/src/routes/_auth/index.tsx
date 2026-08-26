import { createFileRoute, useRouteContext } from "@tanstack/react-router";

const DashboardPage = () => {
  const { session } = useRouteContext({ from: "/_auth/" });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">
        Welcome back, {session.data?.user.name}
      </h1>
    </div>
  );
};

export const Route = createFileRoute("/_auth/")({
  component: DashboardPage,
});

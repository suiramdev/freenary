import { Skeleton } from "@freenary/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages.js";

const DashboardPage = () => {
  // The page is server-rendered for a member, but the name is the browser's
  // to fetch; the heading says so itself, since a nameless heading is what a
  // reader navigating by headings would land on.
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 aria-busy={isPending || undefined} className="text-2xl font-semibold">
        {isPending ? (
          <>
            <output className="sr-only">{m.shell_dashboard_loading()}</output>
            <Skeleton aria-hidden="true" className="h-7 w-72 max-w-full" />
          </>
        ) : (
          m.shell_dashboard_welcome({ name: session?.user.name ?? "" })
        )}
      </h1>
    </div>
  );
};

export const Route = createFileRoute("/_auth/")({
  component: DashboardPage,
});

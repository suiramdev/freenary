import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@freenary/ui/components/breadcrumb";
import { Separator } from "@freenary/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@freenary/ui/components/sidebar";
import { TooltipProvider } from "@freenary/ui/components/tooltip";
import {
  Outlet,
  createFileRoute,
  redirect,
  useMatches,
} from "@tanstack/react-router";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { authClient } from "@/lib/auth-client";
import { navTitleOf } from "@/lib/nav-items";
import { client } from "@/utils/orpc";

const AuthLayout = () => {
  const matches = useMatches();
  const pageTitle = navTitleOf(matches.at(-1)?.routeId);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger size="icon" className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4 !self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

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

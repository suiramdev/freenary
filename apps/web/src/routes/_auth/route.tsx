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
import { Outlet, createFileRoute, redirect, useMatches } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

const routeTitles: Record<string, string> = {
  "/_auth/": "Home",
  "/_auth/portfolio": "Portfolio",
  "/_auth/budget": "Budget",
  "/_auth/analysis": "Analysis",
  "/_auth/goals": "Goals",
  "/_auth/ai": "AI",
};

const AuthLayout = () => {
  const matches = useMatches();
  const leafMatch = matches[matches.length - 1];
  const pageTitle = routeTitles[leafMatch?.routeId ?? ""] ?? "Home";

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger size="icon" className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !self-auto h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <Outlet />
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

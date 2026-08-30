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
import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";

import { AuthGate } from "@/components/auth/auth-gate";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { navTitleOf } from "@/lib/nav-items";

const AuthLayout = () => {
  const matches = useMatches();
  const pageTitle = navTitleOf(matches.at(-1)?.routeId);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            {/* SidebarTrigger's own default is icon-sm; pin the control to the
                default button size. */}
            <SidebarTrigger size="default" className="-ml-1" />
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
            <AuthGate audience="member">
              <Outlet />
            </AuthGate>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

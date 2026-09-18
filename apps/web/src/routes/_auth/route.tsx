import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
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
import { Fragment } from "react";

import { AuthGate } from "@/components/auth/auth-gate";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { navTrailOf } from "@/lib/nav-items";

const AuthLayout = () => {
  const matches = useMatches();
  const trail = navTrailOf(matches.at(-1)?.routeId);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger size="default" className="-ms-1" />
            <Separator orientation="vertical" className="me-2 h-4 !self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                {trail.map((title, depth) => {
                  const isCurrentPage = depth === trail.length - 1;

                  return (
                    <Fragment key={title}>
                      {depth > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isCurrentPage ? (
                          <BreadcrumbPage>{title}</BreadcrumbPage>
                        ) : (
                          title
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  );
                })}
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
  beforeLoad: ({ context: { viewer } }) => {
    if (viewer.kind === "guest") {
      throw redirect({ to: "/login" });
    }

    if (viewer.kind === "member" && !viewer.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: AuthLayout,
});

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@freenary/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, LayoutDashboardPlus } from "kubai-icons-react";

import { dashboardsQueryOptions } from "@/entities/dashboard";
import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import { kubaiIcon } from "@/shared/lib/kubai-icon";

import { isCurrentNav, NAV_ITEMS } from "./nav-items";
import type { NavEntry } from "./nav-items";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarFirstSteps } from "./sidebar-first-steps";
import { SidebarUserMenu } from "./sidebar-user-menu";

const DASHBOARD_SKELETON_ROWS = 3;

const DashboardIcon = kubaiIcon(LayoutDashboard, CHART_COLOR_VARS.grey);

const NewDashboardIcon = kubaiIcon(LayoutDashboardPlus, CHART_COLOR_VARS.pink);

const NavRow = ({ item, pathname }: { item: NavEntry; pathname: string }) => (
  <SidebarMenuItem>
    <SidebarMenuButton
      icon={kubaiIcon(item.icon, item.color)}
      isActive={isCurrentNav(pathname, item.to)}
      render={<Link to={item.to} />}
    >
      {item.label()}
    </SidebarMenuButton>
  </SidebarMenuItem>
);

const DashboardsGroup = ({ pathname }: { pathname: string }) => {
  const dashboards = useQuery(dashboardsQueryOptions());

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground">
        {m.nav_dashboards()}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {dashboards.isPending &&
            Array.from({ length: DASHBOARD_SKELETON_ROWS }, (_, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))}
          {dashboards.data?.dashboards.map((dashboard) => (
            <SidebarMenuItem key={dashboard.id}>
              <SidebarMenuButton
                icon={DashboardIcon}
                isActive={pathname === `/dashboards/${dashboard.id}`}
                render={
                  <Link
                    params={{ dashboardId: dashboard.id }}
                    title={dashboard.title}
                    to="/dashboards/$dashboardId"
                  />
                }
              >
                {dashboard.title}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              icon={NewDashboardIcon}
              render={
                <Link search={{ draft: m.dashboards_new_prompt() }} to="/ask" />
              }
            >
              {m.nav_new_dashboard()}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const RAIL_BELOW_THE_BANNER =
  "top-[var(--update-banner-height,0px)] h-[calc(100svh-var(--update-banner-height,0px))]";

export const AppSidebar = () => {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <Sidebar
      className={RAIL_BELOW_THE_BANNER}
      collapsible="offcanvas"
      variant="floating"
    >
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <NavRow item={item} key={item.to} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <DashboardsGroup pathname={pathname} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarFirstSteps />
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
};

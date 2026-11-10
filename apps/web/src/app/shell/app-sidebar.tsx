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
} from "@freenary/ui/components/sidebar";
import { Link, useLocation } from "@tanstack/react-router";

import { m } from "@/paraglide/messages.js";
import { kubaiIcon } from "@/shared/lib/kubai-icon";

import { isCurrentNav, NAV_ITEMS } from "./nav-items";
import type { NavEntry } from "./nav-items";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarFirstSteps } from "./sidebar-first-steps";
import { SidebarUserMenu } from "./sidebar-user-menu";

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
          <SidebarGroupLabel className="text-muted-foreground">
            {m.nav_group_application()}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <NavRow item={item} key={item.to} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarFirstSteps />
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
};

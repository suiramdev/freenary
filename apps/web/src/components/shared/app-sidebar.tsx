import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@freenary/ui/components/sidebar";
import { Link } from "@tanstack/react-router";

import { SidebarUserMenu } from "@/components/shared/sidebar-user-menu";
import { NAV_ITEMS } from "@/lib/nav-items";
import { m } from "@/paraglide/messages.js";

export const AppSidebar = () => (
  <Sidebar collapsible="icon" variant="floating">
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>{m.nav_group_application()}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {NAV_ITEMS.map(({ icon: Icon, label, planned, to }) => {
              const title = label();

              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    render={<Link to={to} />}
                    tooltip={
                      planned
                        ? m.shell_nav_planned_tooltip({ page: title })
                        : title
                    }
                    className={
                      planned
                        ? "text-sidebar-foreground/40 hover:text-sidebar-foreground/50"
                        : undefined
                    }
                  >
                    <Icon data-icon="inline-start" />
                    <span>{title}</span>
                  </SidebarMenuButton>
                  {planned && (
                    <SidebarMenuBadge className="text-muted-foreground/60">
                      {m.shell_nav_planned_badge()}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarUserMenu />
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
);

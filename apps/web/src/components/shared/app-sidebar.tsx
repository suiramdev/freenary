import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@freenary/ui/components/sidebar";
import { RiArrowRightSLine } from "@remixicon/react";
import { Link, useLocation } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { SidebarBrand } from "@/components/shared/sidebar-brand";
import { SidebarFirstSteps } from "@/components/shared/sidebar-first-steps";
import { SidebarUserMenu } from "@/components/shared/sidebar-user-menu";
import { isNavArea, NAV_ITEMS } from "@/lib/nav-items";
import type { NavAreaEntry } from "@/lib/nav-items";
import { m } from "@/paraglide/messages.js";

type NavEntry = (typeof NAV_ITEMS)[number];

const PLANNED_DIMMED_CLASS =
  "text-sidebar-foreground/40 hover:text-sidebar-foreground/50";

const AREA_LABEL_CLASS = "min-w-0 flex-1 truncate";

const SUB_ROW_CLASS =
  "transition-[opacity,translate,filter] duration-200 ease-fluid [transition-delay:calc(var(--nav-sub-index,0)*60ms)] group-data-starting-style/collapsible-content:-translate-y-1 group-data-starting-style/collapsible-content:opacity-0 group-data-starting-style/collapsible-content:blur-[4px] group-data-ending-style/collapsible-content:opacity-0 group-data-ending-style/collapsible-content:delay-0 motion-reduce:transition-none";

const subRowStaggerStyle = (
  index: number
): CSSProperties & { "--nav-sub-index": number } => ({
  "--nav-sub-index": index,
});

const isCurrent = (pathname: string, to: string) =>
  to === "/"
    ? pathname === to
    : pathname === to || pathname.startsWith(`${to}/`);

const NavRow = ({ item, pathname }: { item: NavEntry; pathname: string }) => {
  const title = item.label();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={item.planned ? PLANNED_DIMMED_CLASS : undefined}
        isActive={isCurrent(pathname, item.to)}
        render={<Link to={item.to} />}
      >
        <item.icon data-icon="inline-start" />
        <span>{title}</span>
      </SidebarMenuButton>
      {item.planned && (
        <SidebarMenuBadge className="text-muted-foreground/60">
          {m.shell_nav_planned_badge()}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
};

const NavAreaDisclosure = ({
  item,
  pathname,
}: {
  item: NavAreaEntry;
  pathname: string;
}) => {
  const title = item.label();
  const isAreaCurrent = isCurrent(pathname, item.to);

  return (
    <Collapsible defaultOpen={isAreaCurrent} render={<SidebarMenuItem />}>
      <SidebarMenuButton
        isActive={isAreaCurrent}
        render={<CollapsibleTrigger />}
      >
        <item.icon data-icon="inline-start" />
        <span className={AREA_LABEL_CLASS}>{title}</span>
        <RiArrowRightSLine
          aria-hidden="true"
          className="text-sidebar-foreground/50 ease-fluid transition-transform duration-150 group-data-panel-open/collapsible-trigger:rotate-90"
        />
      </SidebarMenuButton>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children.map((page, index) => (
            <SidebarMenuSubItem
              className={SUB_ROW_CLASS}
              key={page.to}
              style={subRowStaggerStyle(index)}
            >
              <SidebarMenuSubButton
                isActive={isCurrent(pathname, page.to)}
                render={<Link to={page.to} />}
              >
                <span>{page.label()}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AppSidebar = () => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { isMobile, state } = useSidebar();
  const hidesSubMenus = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="offcanvas" variant="floating">
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav_group_application()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) =>
                isNavArea(item) && !hidesSubMenus ? (
                  <NavAreaDisclosure
                    item={item}
                    key={item.to}
                    pathname={pathname}
                  />
                ) : (
                  <NavRow item={item} key={item.to} pathname={pathname} />
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarFirstSteps />
        <SidebarUserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

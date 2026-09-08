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

import { SidebarBrand } from "@/components/shared/sidebar-brand";
import { SidebarFirstSteps } from "@/components/shared/sidebar-first-steps";
import { SidebarUserMenu } from "@/components/shared/sidebar-user-menu";
import { isNavArea, NAV_ITEMS } from "@/lib/nav-items";
import type { NavAreaEntry } from "@/lib/nav-items";
import { m } from "@/paraglide/messages.js";

type NavEntry = (typeof NAV_ITEMS)[number];

/** Dimmed rather than hidden: a planned area still says what is coming. */
const PLANNED_CLASS =
  "text-sidebar-foreground/40 hover:text-sidebar-foreground/50";

/** The label takes the row's spare width so the chevron keeps its own column. */
const LABEL_CLASS = "min-w-0 flex-1 truncate";

const isCurrent = (pathname: string, to: string) =>
  to === "/"
    ? pathname === to
    : pathname === to || pathname.startsWith(`${to}/`);

const NavRow = ({ item, pathname }: { item: NavEntry; pathname: string }) => {
  const title = item.label();
  const tooltip = item.planned
    ? m.shell_nav_planned_tooltip({ page: title })
    : title;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={item.planned ? PLANNED_CLASS : undefined}
        isActive={isCurrent(pathname, item.to)}
        render={<Link to={item.to} />}
        tooltip={tooltip}
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

/**
 * An area with pages of its own. The parent row discloses them rather than
 * navigating: it is the area, not a page. The icon rail hides every sub-menu,
 * so there the area falls back to `NavRow` and its icon stays a link.
 */
const NavArea = ({
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
        tooltip={title}
      >
        <item.icon data-icon="inline-start" />
        <span className={LABEL_CLASS}>{title}</span>
        <RiArrowRightSLine
          aria-hidden="true"
          className="text-sidebar-foreground/50 transition-transform duration-150 ease-out group-data-panel-open/collapsible-trigger:rotate-90"
        />
      </SidebarMenuButton>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children.map((page) => (
            <SidebarMenuSubItem key={page.to}>
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
  // A disclosure row on the icon rail would toggle a panel nobody can see.
  const isRail = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav_group_application()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) =>
                isNavArea(item) && !isRail ? (
                  <NavArea item={item} key={item.to} pathname={pathname} />
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

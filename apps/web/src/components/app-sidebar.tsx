import { Avatar, AvatarFallback } from "@freenary/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
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
  useSidebar,
} from "@freenary/ui/components/sidebar";
import {
  BrainIcon,
  CaretUpDownIcon,
  ChartBarIcon,
  CurrencyCircleDollarIcon,
  HouseIcon,
  SignOutIcon,
  TargetIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

const navItems = [
  { icon: HouseIcon, planned: false, title: "Home", to: "/" },
  { icon: WalletIcon, planned: true, title: "Portfolio", to: "/portfolio" },
  {
    icon: CurrencyCircleDollarIcon,
    planned: false,
    title: "Budget",
    to: "/budget",
  },
  { icon: ChartBarIcon, planned: true, title: "Analysis", to: "/analysis" },
  { icon: TargetIcon, planned: true, title: "Goals", to: "/goals" },
  { icon: BrainIcon, planned: true, title: "AI", to: "/ai" },
];

export const AppSidebar = () => {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { data: session } = authClient.useSession();

  const userInitials =
    session?.user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/login" });
        },
      },
    });
  };

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ title, to, icon: Icon, planned }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    render={<Link to={to} />}
                    tooltip={planned ? `${title} (Planned)` : title}
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
                    <SidebarMenuBadge className="text-muted-foreground/60 text-[0.625rem]">
                      Planned
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session?.user.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {session?.user.email}
                  </span>
                </div>
                <CaretUpDownIcon className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 text-left text-sm">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 leading-tight">
                        <span className="truncate font-medium">
                          {session?.user.name}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {session?.user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <SignOutIcon data-icon="inline-start" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@freenary/ui/components/sidebar";
import {
  RiBookOpenLine,
  RiContrastLine,
  RiExpandUpDownLine,
  RiLogoutBoxLine,
  RiTranslate2,
} from "@remixicon/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { LocaleMenuItems } from "@/components/shared/locale-menu-items";
import { ThemeMenuItems } from "@/components/shared/theme-menu-items";
import { UserIdentity } from "@/components/shared/user-identity";
import { authClient } from "@/lib/auth-client";
import { docsUrl } from "@/lib/docs";
import { m } from "@/paraglide/messages.js";

export const SidebarUserMenu = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMobile } = useSidebar();
  const { data: session, isPending, refetch } = authClient.useSession();

  const refetchSessionThenLeaveAndDropCache = async () => {
    await refetch();
    await navigate({ to: "/login" });
    queryClient.clear();
  };

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: { onSuccess: refetchSessionThenLeaveAndDropCache },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem aria-busy={isPending || undefined}>
        {isPending && (
          <output className="sr-only">{m.account_menu_loading()}</output>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <UserIdentity
              email={session?.user.email}
              isPending={isPending}
              name={session?.user.name}
            />
            <RiExpandUpDownLine className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2 text-left text-sm">
                  <UserIdentity
                    email={session?.user.email}
                    name={session?.user.name}
                  />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RiTranslate2 data-icon="inline-start" />
                  {m.locale_switcher_label()}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <LocaleMenuItems />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RiContrastLine data-icon="inline-start" />
                  {m.theme_switcher_label()}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <ThemeMenuItems />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <a href={docsUrl()} rel="noopener noreferrer" target="_blank">
                    <RiBookOpenLine data-icon="inline-start" />
                    {m.account_documentation()}
                  </a>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <RiLogoutBoxLine data-icon="inline-start" />
                {m.account_sign_out()}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

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
  RiExpandUpDownLine,
  RiLogoutBoxLine,
  RiTranslate2,
} from "@remixicon/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { LocaleMenuItems } from "@/components/shared/locale-menu-items";
import { UserIdentity } from "@/components/shared/user-identity";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages.js";

export const SidebarUserMenu = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMobile } = useSidebar();
  const { data: session, isPending, refetch } = authClient.useSession();

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          // signOut settles before better-auth updates its session atom, and
          // AuthGate routes on that atom — leaving now bounces off /login.
          await refetch();
          await navigate({ to: "/login" });
          // Only once the authenticated tree is gone: its queries would
          // otherwise refetch on a dead cookie, and the next user would be
          // gated on this one's cached onboarding status.
          queryClient.clear();
        },
      },
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
              // The identity row is two lines tall: a default-height sidebar
              // row clips the avatar and the email.
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

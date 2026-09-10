import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { MenuItem } from "@freenary/ui/components/menu-item";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@freenary/ui/components/sidebar";
import {
  RiBookOpenLine,
  RiExpandUpDownLine,
  RiLogoutBoxLine,
} from "@remixicon/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  LOCALE_OPTION_COUNT,
  LocaleMenuItems,
} from "@/components/shared/locale-menu-items";
import {
  THEME_OPTION_COUNT,
  ThemeMenuItems,
} from "@/components/shared/theme-menu-items";
import { UserIdentity } from "@/components/shared/user-identity";
import { authClient } from "@/lib/auth-client";
import { docsUrl } from "@/lib/docs";
import { remixIcon } from "@/lib/remix-icon";
import { m } from "@/paraglide/messages.js";

// Fluid Functionalism menu rows register by flat index across the popup.
const THEME_START = LOCALE_OPTION_COUNT;
const DOCS_INDEX = THEME_START + THEME_OPTION_COUNT;
const SIGN_OUT_INDEX = DOCS_INDEX + 1;

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
          <DropdownTrigger
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
          </DropdownTrigger>
          <DropdownContent
            align="end"
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownLabel>
              <div className="flex items-center gap-2 text-left text-sm">
                <UserIdentity
                  email={session?.user.email}
                  name={session?.user.name}
                />
              </div>
            </DropdownLabel>
            <DropdownSeparator />
            {/* Fluid Functionalism's dropdown carries no submenu, so the
                language and appearance choices sit inline under headings. */}
            <DropdownLabel>{m.locale_switcher_label()}</DropdownLabel>
            <LocaleMenuItems />
            <DropdownSeparator />
            <DropdownLabel>{m.theme_switcher_label()}</DropdownLabel>
            <ThemeMenuItems startIndex={THEME_START} />
            <DropdownSeparator />
            {/* The documentation for the version this image was built from. */}
            <MenuItem
              icon={remixIcon(RiBookOpenLine)}
              index={DOCS_INDEX}
              label={m.account_documentation()}
              onSelect={() => {
                window.open(docsUrl(), "_blank", "noopener,noreferrer");
              }}
            />
            <MenuItem
              icon={remixIcon(RiLogoutBoxLine)}
              index={SIGN_OUT_INDEX}
              label={m.account_sign_out()}
              onSelect={handleSignOut}
            />
          </DropdownContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

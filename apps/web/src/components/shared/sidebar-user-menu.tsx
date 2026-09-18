import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownSubmenu,
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
  RiContrastLine,
  RiExpandUpDownLine,
  RiLogoutBoxLine,
  RiTranslate2,
} from "@remixicon/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  LocaleMenuItems,
  localeCheckedIndex,
} from "@/components/shared/locale-menu-items";
import {
  ThemeMenuItems,
  useThemeCheckedIndex,
} from "@/components/shared/theme-menu-items";
import { UserIdentity } from "@/components/shared/user-identity";
import { authClient } from "@/lib/auth-client";
import { docsUrl } from "@/lib/docs";
import { remixIcon } from "@/lib/remix-icon";
import { m } from "@/paraglide/messages.js";

const LOCALE_ROW = 0;
const THEME_ROW = 1;
const DOCS_ROW = 2;
const SIGN_OUT_ROW = 3;

const SUBMENU_CLASS = "w-48 min-w-0";

export const SidebarUserMenu = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMobile } = useSidebar();
  const { data: session, isPending, refetch } = authClient.useSession();
  const themeCheckedIndex = useThemeCheckedIndex();

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
          <DropdownTrigger
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
            <RiExpandUpDownLine className="ml-auto size-3.5 shrink-0" />
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
            <DropdownSubmenu>
              <MenuItem
                icon={remixIcon(RiTranslate2)}
                index={LOCALE_ROW}
                label={m.locale_switcher_label()}
                submenu
              />
              <DropdownContent
                align="start"
                checkedIndex={localeCheckedIndex()}
                className={SUBMENU_CLASS}
                side="right"
              >
                <DropdownLabel>{m.locale_switcher_label()}</DropdownLabel>
                <LocaleMenuItems />
              </DropdownContent>
            </DropdownSubmenu>
            <DropdownSubmenu>
              <MenuItem
                icon={remixIcon(RiContrastLine)}
                index={THEME_ROW}
                label={m.theme_switcher_label()}
                submenu
              />
              <DropdownContent
                align="start"
                checkedIndex={themeCheckedIndex}
                className={SUBMENU_CLASS}
                side="right"
              >
                <DropdownLabel>{m.theme_switcher_label()}</DropdownLabel>
                <ThemeMenuItems />
              </DropdownContent>
            </DropdownSubmenu>
            <DropdownSeparator />
            <MenuItem
              icon={remixIcon(RiBookOpenLine)}
              index={DOCS_ROW}
              label={m.account_documentation()}
              onSelect={() => {
                window.open(docsUrl(), "_blank", "noopener,noreferrer");
              }}
            />
            <MenuItem
              icon={remixIcon(RiLogoutBoxLine)}
              index={SIGN_OUT_ROW}
              label={m.account_sign_out()}
              onSelect={handleSignOut}
            />
          </DropdownContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

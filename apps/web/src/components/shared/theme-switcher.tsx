import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { RiContrastLine } from "@remixicon/react";

import { ThemeMenuItems } from "@/components/shared/theme-menu-items";
import { m } from "@/paraglide/messages.js";

/**
 * Standalone appearance control for the surfaces with no account menu to hang it
 * off — the login screen and the onboarding header.
 *
 * The trigger names the control rather than the current choice: which theme is
 * active is only known once the browser has read the stored preference, so
 * rendering it here would either mismatch on hydration or flicker.
 */
export const ThemeSwitcher = () => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" />}>
      <RiContrastLine data-icon="inline-start" />
      {m.theme_switcher_label()}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuGroup>
        <DropdownMenuLabel>{m.theme_switcher_label()}</DropdownMenuLabel>
        <ThemeMenuItems />
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

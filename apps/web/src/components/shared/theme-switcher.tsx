import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { RiContrastLine } from "@remixicon/react";

import { ThemeMenuItems } from "@/components/shared/theme-menu-items";
import { remixIcon } from "@/lib/remix-icon";
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
    <DropdownTrigger
      render={
        <Button leadingIcon={remixIcon(RiContrastLine)} variant="ghost" />
      }
    >
      {m.theme_switcher_label()}
    </DropdownTrigger>
    <DropdownContent align="end">
      <DropdownLabel>{m.theme_switcher_label()}</DropdownLabel>
      <ThemeMenuItems />
    </DropdownContent>
  </DropdownMenu>
);

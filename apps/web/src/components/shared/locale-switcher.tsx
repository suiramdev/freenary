import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { RiTranslate2 } from "@remixicon/react";

import { LocaleMenuItems } from "@/components/shared/locale-menu-items";
import { LOCALE_LABELS } from "@/lib/i18n";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/**
 * Standalone language control for the surfaces with no account menu to hang it
 * off — the login screen and the onboarding header.
 */
export const LocaleSwitcher = () => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" />}>
      <RiTranslate2 data-icon="inline-start" />
      {LOCALE_LABELS[getLocale()]}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuGroup>
        <DropdownMenuLabel>{m.locale_switcher_label()}</DropdownMenuLabel>
        <LocaleMenuItems />
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

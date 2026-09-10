import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { RiTranslate2 } from "@remixicon/react";

import { LocaleMenuItems } from "@/components/shared/locale-menu-items";
import { LOCALE_LABELS } from "@/lib/i18n";
import { remixIcon } from "@/lib/remix-icon";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/**
 * Standalone language control for the surfaces with no account menu to hang it
 * off — the login screen and the onboarding header.
 */
export const LocaleSwitcher = () => (
  <DropdownMenu>
    <DropdownTrigger
      render={<Button leadingIcon={remixIcon(RiTranslate2)} variant="ghost" />}
    >
      {LOCALE_LABELS[getLocale()]}
    </DropdownTrigger>
    <DropdownContent align="end">
      <DropdownLabel>{m.locale_switcher_label()}</DropdownLabel>
      <LocaleMenuItems />
    </DropdownContent>
  </DropdownMenu>
);

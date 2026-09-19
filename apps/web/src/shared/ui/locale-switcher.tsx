import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { RiTranslate2 } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

import { LOCALE_LABELS } from "../i18n/locales";
import { remixIcon } from "../lib/remix-icon";
import { LocaleMenuItems, localeCheckedIndex } from "./locale-menu-items";

export const LocaleSwitcher = () => (
  <DropdownMenu>
    <DropdownTrigger
      render={<Button leadingIcon={remixIcon(RiTranslate2)} variant="ghost" />}
    >
      {LOCALE_LABELS[getLocale()]}
    </DropdownTrigger>
    <DropdownContent align="end" checkedIndex={localeCheckedIndex()}>
      <DropdownLabel>{m.locale_switcher_label()}</DropdownLabel>
      <LocaleMenuItems />
    </DropdownContent>
  </DropdownMenu>
);

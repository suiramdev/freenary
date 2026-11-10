import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { Languages } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

import { LOCALE_LABELS } from "../i18n/locales";
import { CHART_COLOR_VARS } from "../lib/chart-colors";
import { kubaiIcon } from "../lib/kubai-icon";
import { LocaleMenuItems, localeCheckedIndex } from "./locale-menu-items";

export const LocaleSwitcher = () => (
  <DropdownMenu>
    <DropdownTrigger
      render={
        <Button
          leadingIcon={kubaiIcon(Languages, CHART_COLOR_VARS.blue)}
          variant="ghost"
        />
      }
    >
      {LOCALE_LABELS[getLocale()]}
    </DropdownTrigger>
    <DropdownContent align="end" checkedIndex={localeCheckedIndex()}>
      <DropdownLabel>{m.locale_switcher_label()}</DropdownLabel>
      <LocaleMenuItems />
    </DropdownContent>
  </DropdownMenu>
);

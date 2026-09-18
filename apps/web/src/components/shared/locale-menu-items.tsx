import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@freenary/ui/components/dropdown-menu";

import { LOCALE_LABELS } from "@/lib/i18n";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";

export const LocaleMenuItems = () => (
  <DropdownMenuRadioGroup value={getLocale()}>
    {locales.map((locale) => (
      <DropdownMenuRadioItem
        key={locale}
        onClick={() => setLocale(locale)}
        value={locale}
      >
        {LOCALE_LABELS[locale]}
      </DropdownMenuRadioItem>
    ))}
  </DropdownMenuRadioGroup>
);

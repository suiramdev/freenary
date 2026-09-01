import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@freenary/ui/components/dropdown-menu";

import { LOCALE_LABELS } from "@/lib/i18n";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";

/**
 * The locale choices themselves, so the login screen, the onboarding header and
 * the sidebar offer one list instead of three.
 *
 * `setLocale` reloads: the locale travels to the server as a cookie, and the
 * reload is what makes the next render — `<html lang>` included — agree with it.
 */
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

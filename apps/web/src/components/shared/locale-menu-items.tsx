import { MenuItem } from "@freenary/ui/components/menu-item";

import { LOCALE_LABELS } from "@/lib/i18n";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";

export const LOCALE_OPTION_COUNT = locales.length;

/**
 * The locale choices themselves, so the login screen, the onboarding header and
 * the sidebar offer one list instead of three.
 *
 * `setLocale` reloads: the locale travels to the server as a cookie, and the
 * reload is what makes the next render — `<html lang>` included — agree with it.
 *
 * Fluid Functionalism menu rows register by flat index across the whole
 * popup, so a parent embedding these after other rows passes `startIndex`.
 */
export const LocaleMenuItems = ({
  startIndex = 0,
}: {
  startIndex?: number;
}) => (
  <>
    {locales.map((locale, position) => (
      <MenuItem
        checked={getLocale() === locale}
        index={startIndex + position}
        key={locale}
        label={LOCALE_LABELS[locale]}
        onSelect={() => setLocale(locale)}
      />
    ))}
  </>
);

import { MenuItem } from "@freenary/ui/components/menu-item";

import { LOCALE_LABELS } from "@/lib/i18n";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";

export const LocaleMenuItems = () => (
  <>
    {locales.map((locale, position) => (
      <MenuItem
        checked={getLocale() === locale}
        index={position}
        key={locale}
        label={LOCALE_LABELS[locale]}
        onSelect={() => setLocale(locale)}
      />
    ))}
  </>
);

export const localeCheckedIndex = () => locales.indexOf(getLocale());

import { MenuItem } from "@freenary/ui/components/menu-item";

import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";

import { LOCALE_LABELS } from "../i18n/locales";

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

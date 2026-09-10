import { MenuItem } from "@freenary/ui/components/menu-item";

import { LOCALE_LABELS } from "@/lib/i18n";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";

export const LOCALE_OPTION_COUNT = locales.length;

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

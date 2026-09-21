import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@freenary/ui/components/select";

import { m } from "@/paraglide/messages.js";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";
import type { Locale } from "@/paraglide/runtime.js";

import { LOCALE_LABELS } from "../i18n/locales";

const TRIGGER_WIDTH = "w-44";

const isLocale = (value: string): value is Locale =>
  locales.some((locale) => locale === value);

export const LocaleSelect = () => (
  <Select
    onValueChange={(next: string) => {
      if (isLocale(next)) {
        setLocale(next);
      }
    }}
    value={getLocale()}
  >
    <SelectTrigger
      aria-label={m.locale_switcher_label()}
      className={TRIGGER_WIDTH}
      placeholder={m.locale_switcher_label()}
    />
    <SelectContent>
      <SelectGroup>
        {locales.map((locale, position) => (
          <SelectItem index={position} key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

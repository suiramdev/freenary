import type { Locale } from "@/paraglide/runtime.js";
import { dayDelta, localDayOfBankDate } from "@/shared/lib/calendar-day";

const NEAREST_NAMED_DAY = 1;

const SAME_YEAR_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};

const OTHER_YEAR_FORMAT: Intl.DateTimeFormatOptions = {
  ...SAME_YEAR_FORMAT,
  year: "numeric",
};

export const bankDayLabel = (
  bankDate: string,
  today: Date,
  locale: Locale
): string => {
  const day = localDayOfBankDate(bankDate);
  const delta = dayDelta(today, day);

  if (Math.abs(delta) <= NEAREST_NAMED_DAY) {
    const relative = new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(delta, "day");

    return `${relative.charAt(0).toLocaleUpperCase(locale)}${relative.slice(1)}`;
  }

  const format =
    day.getFullYear() === today.getFullYear()
      ? SAME_YEAR_FORMAT
      : OTHER_YEAR_FORMAT;

  return day.toLocaleDateString(locale, format);
};

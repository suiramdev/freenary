import { getLocale } from "@/paraglide/runtime.js";

const MS_IN_S = 1000;
const S_IN_MIN = 60;
const TENTHS_BELOW_S = 10;

export const formatDuration = (ms: number): string => {
  const seconds = ms / MS_IN_S;
  const locale = getLocale();
  const unit = (value: number, name: "minute" | "second", digits = 0) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: digits,
      style: "unit",
      unit: name,
      unitDisplay: "narrow",
    }).format(value);

  if (seconds < TENTHS_BELOW_S) {
    return unit(seconds, "second", 1);
  }

  const roundedSeconds = Math.round(seconds);

  if (roundedSeconds < S_IN_MIN) {
    return unit(roundedSeconds, "second");
  }

  const minutes = Math.floor(roundedSeconds / S_IN_MIN);
  const secondsWithinMinute = roundedSeconds - minutes * S_IN_MIN;

  return `${unit(minutes, "minute")} ${unit(secondsWithinMinute, "second")}`;
};

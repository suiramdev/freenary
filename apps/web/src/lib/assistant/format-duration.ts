import { getLocale } from "@/paraglide/runtime.js";

const MS_IN_S = 1000;
const S_IN_MIN = 60;
const TENTHS_BELOW_S = 10;

/** "0.8 s", "12 s", "1 min 5 s" in the reader's locale. */
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

  // Rounded once, before the split: rounding the remainder on its own turns
  // 119.6 s into "1 min 60 s".
  const total = Math.round(seconds);
  if (total < S_IN_MIN) {
    return unit(total, "second");
  }

  const minutes = Math.floor(total / S_IN_MIN);
  return `${unit(minutes, "minute")} ${unit(total - minutes * S_IN_MIN, "second")}`;
};

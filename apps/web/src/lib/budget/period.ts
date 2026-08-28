export type TimeRange = "1M" | "3M" | "1Y";

export type AggregationMode = "total" | "average" | "median";

export const AGGREGATION_MODES: AggregationMode[] = [
  "total",
  "average",
  "median",
];

export const AGGREGATION_LABELS: Record<AggregationMode, string> = {
  average: "Monthly avg.",
  median: "Monthly median",
  total: "Total",
};

/** True when the selected range spans more than a single month. */
export const isMultiMonth = (range: TimeRange) => range !== "1M";

/** Number of calendar months the range spans. */
export const rangeMonths = (range: TimeRange): number => {
  switch (range) {
    case "3M": {
      return 3;
    }
    case "1Y": {
      return 12;
    }
    default: {
      return 1;
    }
  }
};

/**
 * Human-readable period label.
 * - "1M": "August 2026"
 * - "3M" same year: "Jun – Aug 2026"
 * - "3M" cross year: "Nov 2025 – Jan 2026"
 * - "1Y": "2026"
 */
export const formatPeriodLabel = (
  from: Date,
  to: Date,
  range: TimeRange
): string => {
  if (range === "1M") {return formatMonthYear(from);}
  if (range === "1Y") {return String(from.getFullYear());}

  const opts: Intl.DateTimeFormatOptions = { month: "short" };
  const fromMonth = from.toLocaleDateString(undefined, opts);
  const toMonth = to.toLocaleDateString(undefined, opts);
  const fromYear = from.getFullYear();
  const toYear = to.getFullYear();

  if (fromYear === toYear) {
    return `${fromMonth} – ${toMonth} ${toYear}`;
  }
  return `${fromMonth} ${fromYear} – ${toMonth} ${toYear}`;
};

export const TIME_RANGES: TimeRange[] = ["1M", "3M", "1Y"];

export const computeDateRange = (
  year: number,
  month: number,
  range: TimeRange
) => {
  const anchor = new Date(year, month, 1);
  let from: Date;

  switch (range) {
    case "1M": {
      from = anchor;
      break;
    }
    case "3M": {
      from = new Date(year, month - 2, 1);
      break;
    }
    case "1Y": {
      from = new Date(year, month - 11, 1);
      break;
    }
    default: {
      from = anchor;
    }
  }

  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
};

export const formatMonthYear = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

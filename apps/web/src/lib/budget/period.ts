export type TimeRange = "1M" | "3M" | "1Y";

export const TIME_RANGES: TimeRange[] = ["1M", "3M", "1Y"];

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

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

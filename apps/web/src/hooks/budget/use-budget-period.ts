import { useCallback, useMemo } from "react";

import { computeDateRange, isMultiMonth } from "@/lib/budget/period";
import type { AggregationMode, TimeRange } from "@/lib/budget/period";
import { BUDGET_SEARCH_DEFAULTS } from "@/lib/budget/search";

const DECEMBER = 11;

/** One interaction, one patch: a field left out keeps whatever it has. */
export interface BudgetPeriodPatch {
  aggregation?: AggregationMode;
  month?: number;
  range?: TimeRange;
  year?: number;
}

/**
 * The month the budget page is anchored on, the range it spans, and the date
 * boundaries of available transaction data. The period lives in the URL, so
 * this hook only derives: an explicit anchor wins, otherwise the last month
 * with data, otherwise now.
 */
export const useBudgetPeriod = ({
  aggregation = BUDGET_SEARCH_DEFAULTS.agg,
  dateBounds,
  month,
  onChange,
  range = BUDGET_SEARCH_DEFAULTS.range,
  year,
}: {
  aggregation?: AggregationMode;
  dateBounds?: { first: Date | null; last: Date | null };
  month?: number;
  onChange: (patch: BudgetPeriodPatch) => void;
  range?: TimeRange;
  year?: number;
}) => {
  const lastDataDate = dateBounds?.last;

  const anchor = useMemo(() => {
    const fallback = lastDataDate ?? new Date();
    return {
      month: month ?? fallback.getMonth(),
      year: year ?? fallback.getFullYear(),
    };
  }, [lastDataDate, month, year]);

  const changeRange = useCallback(
    (next: TimeRange) => {
      const patch: BudgetPeriodPatch = { range: next };
      if (!isMultiMonth(next)) {
        patch.aggregation = "total";
      }
      if (next === "1Y") {
        // Anchoring on December makes the twelve months a calendar year.
        patch.month = DECEMBER;
        patch.year = anchor.year;
      } else if (lastDataDate) {
        // Switching to a shorter range: clamp anchor to last month with data
        // so we don't land on future months without transactions
        // (e.g. after "1Y" forced anchor.month to December).
        const lastMonth = lastDataDate.getMonth();
        const lastYear = lastDataDate.getFullYear();
        if (
          anchor.year > lastYear ||
          (anchor.year === lastYear && anchor.month > lastMonth)
        ) {
          patch.month = lastMonth;
          patch.year = lastYear;
        }
      }
      onChange(patch);
    },
    [anchor, lastDataDate, onChange]
  );

  const setAggregation = useCallback(
    (next: AggregationMode) => onChange({ aggregation: next }),
    [onChange]
  );

  const setMonth = useCallback(
    (nextYear: number, nextMonth: number) =>
      onChange({ month: nextMonth, year: nextYear }),
    [onChange]
  );

  const { from, to } = useMemo(
    () => computeDateRange(anchor.year, anchor.month, range),
    [anchor, range]
  );

  return {
    aggregation,
    /** Earliest month with data (start-of-month). */
    firstMonth: dateBounds?.first
      ? new Date(dateBounds.first.getFullYear(), dateBounds.first.getMonth(), 1)
      : undefined,
    from,
    /** Latest month with data (start-of-month). */
    lastMonth: dateBounds?.last
      ? new Date(dateBounds.last.getFullYear(), dateBounds.last.getMonth(), 1)
      : undefined,
    range,
    setAggregation,
    setMonth,
    setRange: changeRange,
    to,
  };
};

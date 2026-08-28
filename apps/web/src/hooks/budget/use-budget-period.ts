import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { computeDateRange, isMultiMonth } from "@/lib/budget/period";
import type { AggregationMode, TimeRange } from "@/lib/budget/period";

/**
 * The month the budget page is anchored on, the range it spans,
 * and the date boundaries of available transaction data.
 */
export const useBudgetPeriod = (dateBounds?: {
  first: Date | null;
  last: Date | null;
}) => {
  const now = new Date();
  const [anchor, setAnchor] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  });
  const [range, setRangeRaw] = useState<TimeRange>("1M");
  const [aggregation, setAggregation] = useState<AggregationMode>("total");

  // Once we know the last transaction date, snap the anchor to it (once).
  const snapped = useRef(false);
  useEffect(() => {
    if (snapped.current || !dateBounds?.last) return;
    snapped.current = true;
    setAnchor({
      month: dateBounds.last.getMonth(),
      year: dateBounds.last.getFullYear(),
    });
  }, [dateBounds?.last]);

  const setRange = useCallback((next: TimeRange) => {
    setRangeRaw(next);
    if (!isMultiMonth(next)) {
      setAggregation("total");
    }
    if (next === "1Y") {
      setAnchor((prev) => ({ ...prev, month: 11 }));
    }
  }, []);

  const { from, to } = useMemo(
    () => computeDateRange(anchor.year, anchor.month, range),
    [anchor, range],
  );

  return {
    aggregation,
    /** Earliest month with data (start-of-month). */
    firstMonth: dateBounds?.first
      ? new Date(
          dateBounds.first.getFullYear(),
          dateBounds.first.getMonth(),
          1,
        )
      : undefined,
    from,
    /** Latest month with data (start-of-month). */
    lastMonth: dateBounds?.last
      ? new Date(
          dateBounds.last.getFullYear(),
          dateBounds.last.getMonth(),
          1,
        )
      : undefined,
    range,
    setAggregation,
    setMonth: (year: number, month: number) => setAnchor({ month, year }),
    setRange,
    to,
  };
};

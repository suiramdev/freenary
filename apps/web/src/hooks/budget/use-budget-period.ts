import { useCallback, useMemo, useState } from "react";

import { computeDateRange, isMultiMonth } from "@/lib/budget/period";
import type { AggregationMode, TimeRange } from "@/lib/budget/period";

/** The month the budget page is anchored on, and the range it spans. */
export const useBudgetPeriod = () => {
  const now = new Date();
  const [anchor, setAnchor] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  });
  const [range, setRangeRaw] = useState<TimeRange>("1M");
  const [aggregation, setAggregation] = useState<AggregationMode>("total");

  const setRange = useCallback((next: TimeRange) => {
    setRangeRaw(next);
    if (!isMultiMonth(next)) {
      setAggregation("total");
    }
    // 1Y always spans a calendar year (Jan–Dec) — snap anchor to December.
    if (next === "1Y") {
      setAnchor((prev) => ({ ...prev, month: 11 }));
    }
  }, []);

  const { from, to } = useMemo(
    () => computeDateRange(anchor.year, anchor.month, range),
    [anchor, range]
  );

  return {
    aggregation,
    from,
    range,
    setAggregation,
    setMonth: (year: number, month: number) => setAnchor({ month, year }),
    setRange,
    to,
  };
};

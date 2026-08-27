import { useMemo, useState } from "react";

import { computeDateRange } from "@/lib/budget/period";
import type { TimeRange } from "@/lib/budget/period";

/** The month the budget page is anchored on, and the range it spans. */
export const useBudgetPeriod = () => {
  const now = new Date();
  const [anchor, setAnchor] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  });
  const [range, setRange] = useState<TimeRange>("1M");

  const { from, to } = useMemo(
    () => computeDateRange(anchor.year, anchor.month, range),
    [anchor, range]
  );

  return {
    from,
    range,
    setMonth: (year: number, month: number) => setAnchor({ month, year }),
    setRange,
    to,
  };
};

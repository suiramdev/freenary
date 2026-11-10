import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";

import type { SpendSplit } from "../model/recurring";
import { SplitDonutChart } from "./split-donut-chart";

interface RecurringSplitChartProps {
  currency: string;
  split: SpendSplit;
}

export const RecurringSplitChart = ({
  currency,
  split,
}: RecurringSplitChartProps) => {
  const total =
    split.fixedMinor + split.behavioralMinor + split.discretionaryMinor;

  if (total === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_recurring_split_empty()}
      </p>
    );
  }

  return (
    <SplitDonutChart
      currency={currency}
      label={m.budget_recurring_split_chart_label()}
      slices={[
        {
          color: CHART_COLOR_VARS.blue,
          id: "fixed",
          label: m.budget_recurring_series_fixed(),
          value: split.fixedMinor,
        },
        {
          color: CHART_COLOR_VARS.orange,
          id: "behavioral",
          label: m.budget_recurring_series_behavioral(),
          value: split.behavioralMinor,
        },
        {
          color: CHART_COLOR_VARS.grey,
          id: "discretionary",
          label: m.budget_recurring_series_discretionary(),
          value: split.discretionaryMinor,
        },
      ]}
    />
  );
};

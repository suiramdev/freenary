import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";

import { SplitDonutChart } from "./split-donut-chart";

interface FixedVsVariableChartProps {
  currency: string;
  fixed: number;
  variable: number;
}

export const FixedVsVariableChart = ({
  currency,
  fixed,
  variable,
}: FixedVsVariableChartProps) => {
  if (fixed + variable === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_fixed_variable_empty()}
      </p>
    );
  }

  return (
    <SplitDonutChart
      currency={currency}
      label={m.budget_fixed_variable_chart_label()}
      slices={[
        {
          color: CHART_COLOR_VARS.blue,
          id: "fixed",
          label: m.budget_fixed_label(),
          value: fixed,
        },
        {
          color: CHART_COLOR_VARS.orange,
          id: "variable",
          label: m.budget_variable_label(),
          value: variable,
        },
      ]}
    />
  );
};

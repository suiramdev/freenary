import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import { formatCurrency } from "@/shared/lib/format-currency";

import type { FrequencyRow } from "../model/recurring";
import { RankedBarChart } from "./ranked-bar-chart";
import type { RankedBar } from "./ranked-bar-chart";

interface PurchaseFrequencyChartProps {
  currency: string;
  rows: FrequencyRow[];
}

export const PurchaseFrequencyChart = ({
  currency,
  rows,
}: PurchaseFrequencyChartProps) => {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_recurring_frequency_empty()}
      </p>
    );
  }

  const bars = rows.map((row): RankedBar => {
    const isFixed = row.kind === "fixed";
    const color = isFixed ? CHART_COLOR_VARS.blue : CHART_COLOR_VARS.orange;

    return {
      color,
      label: row.label,
      tooltipRows: [
        {
          color,
          label: isFixed
            ? m.budget_recurring_series_fixed()
            : m.budget_recurring_series_behavioral(),
          value: m.budget_recurring_per_year({
            count: Math.round(row.perYear),
          }),
        },
        {
          color,
          label: m.budget_recurring_column_annual(),
          value: formatCurrency(row.annualMinor, currency),
        },
      ],
      value: row.occurrences,
      valueLabel: m.budget_recurring_payments_short({
        count: row.occurrences,
      }),
    };
  });

  return (
    <RankedBarChart
      bars={bars}
      label={m.budget_recurring_frequency_chart_label()}
    />
  );
};

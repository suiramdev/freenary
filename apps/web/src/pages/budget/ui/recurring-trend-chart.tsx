import { Bar } from "@freenary/ui/components/charts/bar";
import { BarChart } from "@freenary/ui/components/charts/bar-chart";
import { BarXAxis } from "@freenary/ui/components/charts/bar-x-axis";
import { Grid } from "@freenary/ui/components/charts/grid";
import { ChartTooltip } from "@freenary/ui/components/charts/tooltip";
import { YAxis } from "@freenary/ui/components/charts/y-axis";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import {
  formatCompactCurrency,
  formatCurrency,
} from "@/shared/lib/format-currency";

import { monthKeyLabel } from "../model/recurring";
import type { RecurringMonth } from "../model/recurring";

interface RecurringTrendChartProps {
  currency: string;
  monthly: RecurringMonth[];
}

interface TrendRow extends Record<string, unknown> {
  behavioralMinor: number;
  discretionaryMinor: number;
  fixedMinor: number;
  label: string;
}

const STACKED_SERIES_BOTTOM_UP = [
  {
    color: CHART_COLOR_VARS.blue,
    key: "fixedMinor",
    label: m.budget_recurring_series_fixed,
  },
  {
    color: CHART_COLOR_VARS.orange,
    key: "behavioralMinor",
    label: m.budget_recurring_series_behavioral,
  },
  {
    color: CHART_COLOR_VARS.grey,
    key: "discretionaryMinor",
    label: m.budget_recurring_series_discretionary,
  },
] as const;

const CHART_MARGIN = { bottom: 28, left: 48, right: 8, top: 8 };

export const RecurringTrendChart = ({
  currency,
  monthly,
}: RecurringTrendChartProps) => {
  const total = monthly.reduce(
    (sum, month) =>
      sum + month.fixedMinor + month.behavioralMinor + month.discretionaryMinor,
    0
  );

  if (total === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_recurring_trend_empty()}
      </p>
    );
  }

  const locale = getLocale();
  const rows: TrendRow[] = monthly.map((month) => ({
    behavioralMinor: month.behavioralMinor,
    discretionaryMinor: month.discretionaryMinor,
    fixedMinor: month.fixedMinor,
    label: monthKeyLabel(month.month, locale),
  }));

  return (
    <figure className="flex h-full flex-col gap-2">
      <figcaption className="sr-only">
        {m.budget_recurring_trend_chart_label()}
      </figcaption>
      <BarChart
        aspectRatio="auto"
        className="min-h-0 flex-1"
        data={rows}
        margin={CHART_MARGIN}
        stacked
        xDataKey="label"
      >
        <Grid horizontal />
        <YAxis
          formatValue={(value) => formatCompactCurrency(value, currency)}
        />
        {STACKED_SERIES_BOTTOM_UP.map((series) => (
          <Bar
            dataKey={series.key}
            fill={series.color}
            key={series.key}
            lineCap="butt"
          />
        ))}
        <BarXAxis />
        <ChartTooltip
          rows={(point) =>
            STACKED_SERIES_BOTTOM_UP.map((series) => ({
              color: series.color,
              label: series.label(),
              value: formatCurrency(Number(point[series.key]), currency),
            }))
          }
          showDatePill={false}
        />
      </BarChart>
      <ul className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1">
        {STACKED_SERIES_BOTTOM_UP.map((series) => (
          <li
            className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
            key={series.key}
          >
            <span
              className="size-2 shrink-0 rounded-[1px]"
              style={{ backgroundColor: series.color }}
            />
            {series.label()}
          </li>
        ))}
      </ul>
    </figure>
  );
};

import { ChartContainer, ChartTooltip } from "@freenary/ui/components/chart";
import type { ChartConfig } from "@freenary/ui/components/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/budget/format-currency";
import { monthKeyLabel } from "@/lib/budget/recurring";
import type { RecurringMonth } from "@/lib/budget/recurring";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

interface RecurringTrendChartProps {
  currency: string;
  monthly: RecurringMonth[];
}

// Stacked bottom-up in this order, and the table holds the message function
// rather than its result: calling it here would freeze the locale at import.
const SERIES = [
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

const STACK_ID = "recurring";

/** One rendered month: the axis reads `label`, the tooltip reads the series. */
interface TrendRow {
  behavioralMinor: number;
  discretionaryMinor: number;
  fixedMinor: number;
  label: string;
}

/**
 * Recharts injects `active` and `payload`. Every figure here is minor units, so
 * the whole tooltip is drawn rather than a default row that prints raw cents.
 */
const TrendTooltip = ({
  active,
  currency,
  payload,
}: {
  active?: boolean;
  currency: string;
  payload?: { payload?: TrendRow }[];
}) => {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) {
    return null;
  }

  return (
    <div className="border-border/50 bg-background grid min-w-40 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{row.label}</div>
      {SERIES.map((series) => (
        <div className="flex items-center gap-2 leading-none" key={series.key}>
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: series.color }}
          />
          <span className="text-muted-foreground flex-1">{series.label()}</span>
          <span className="text-foreground font-mono font-medium tabular-nums">
            {formatCurrency(row[series.key], currency)}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * How recurring cost moves month to month. Stacked rather than grouped: the
 * question is what the month cost in total and how much of it was committed.
 */
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

  const config: ChartConfig = Object.fromEntries(
    SERIES.map((series) => [
      series.key,
      { color: series.color, label: series.label() },
    ])
  );
  const locale = getLocale();
  const rows: TrendRow[] = monthly.map((month) => ({
    behavioralMinor: month.behavioralMinor,
    discretionaryMinor: month.discretionaryMinor,
    fixedMinor: month.fixedMinor,
    label: monthKeyLabel(month.month, locale),
  }));

  return (
    // A figure with an sr-only caption, so the chart carries a name without a
    // `role` on a div. The legend sits in flow rather than inside the chart:
    // recharts orders its own legend by stack offset, not by series order.
    <figure className="flex h-full flex-col gap-2">
      <figcaption className="sr-only">
        {m.budget_recurring_trend_chart_label()}
      </figcaption>
      <ChartContainer
        className="aspect-auto min-h-0 w-full flex-1"
        config={config}
      >
        <BarChart
          accessibilityLayer
          data={rows}
          margin={{ left: 6, right: 4, top: 4 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tickMargin={8}
          />
          {/* A full currency tick is as wide as its locale makes it, so the
              axis measures itself rather than clipping the widest one. */}
          <YAxis
            axisLine={false}
            tickFormatter={(value: number) => formatCurrency(value, currency)}
            tickLine={false}
            width="auto"
          />
          <ChartTooltip
            content={<TrendTooltip currency={currency} />}
            cursor={false}
          />
          {SERIES.map((series) => (
            <Bar
              dataKey={series.key}
              fill={`var(--color-${series.key})`}
              key={series.key}
              maxBarSize={40}
              name={series.key}
              stackId={STACK_ID}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <ul className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1">
        {SERIES.map((series) => (
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

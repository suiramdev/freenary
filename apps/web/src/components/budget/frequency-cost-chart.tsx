import { ChartContainer, ChartTooltip } from "@freenary/ui/components/chart";
import type { ChartConfig } from "@freenary/ui/components/chart";
import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/budget/format-currency";
import type { FrequencyRow } from "@/lib/budget/recurring";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { m } from "@/paraglide/messages.js";

interface FrequencyCostChartProps {
  currency: string;
  points: FrequencyRow[];
}

// One series per kind, so a commitment and a habit never read as one cloud.
// The table holds the message function: calling it at module scope would
// freeze the locale at import time.
const KINDS = [
  {
    color: CHART_COLOR_VARS.blue,
    key: "fixed",
    label: m.budget_recurring_series_fixed,
  },
  {
    color: CHART_COLOR_VARS.orange,
    key: "behavioral",
    label: m.budget_recurring_series_behavioral,
  },
] as const;

/**
 * Recharts injects `active` and `payload`; a point carries a company, a cadence
 * and a cost, which the two axis rows of a default tooltip cannot say.
 */
const FrequencyCostTooltip = ({
  active,
  config,
  currency,
  payload,
}: {
  active?: boolean;
  config: ChartConfig;
  currency: string;
  payload?: { payload?: FrequencyRow }[];
}) => {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) {
    return null;
  }

  return (
    <div className="border-border/50 bg-background grid min-w-40 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="flex items-center gap-1.5 font-medium">
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: config[row.kind]?.color }}
        />
        <span className="max-w-48 truncate">{row.label}</span>
      </div>
      <div className="flex items-center gap-3 leading-none">
        <span className="text-muted-foreground flex-1">
          {m.budget_recurring_per_year({ count: Math.round(row.perYear) })}
        </span>
        <span className="text-foreground font-mono font-medium tabular-nums">
          {formatCurrency(row.annualMinor, currency)}
        </span>
      </div>
    </div>
  );
};

/**
 * Which repeated purchases are both frequent and dear. Up and to the right is
 * where the money goes: a small amount paid often costs as much as one bill.
 */
export const FrequencyCostChart = ({
  currency,
  points,
}: FrequencyCostChartProps) => {
  if (points.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_recurring_scatter_empty()}
      </p>
    );
  }

  const config: ChartConfig = Object.fromEntries(
    KINDS.map((kind) => [kind.key, { color: kind.color, label: kind.label() }])
  );

  return (
    // A figure with an sr-only caption, so the chart carries a name without a
    // `role` on a div. The legend sits in flow: a recharts legend for a scatter
    // series reads its label off a dataKey the series does not have.
    <figure className="flex h-full flex-col gap-2">
      <figcaption className="sr-only">
        {m.budget_recurring_scatter_chart_label()}
      </figcaption>
      <ChartContainer
        className="aspect-auto min-h-0 w-full flex-1"
        config={config}
      >
        <ScatterChart
          accessibilityLayer
          margin={{ left: 6, right: 16, top: 4 }}
        >
          <CartesianGrid />
          {/* `auto` rounds the far end up to a tick: at `dataMax` the dearest
              point sits on the plot edge and renders as half a dot. */}
          <XAxis
            axisLine={false}
            dataKey="perYear"
            domain={[0, "auto"]}
            tickFormatter={(value: number) => String(Math.round(value))}
            tickLine={false}
            tickMargin={8}
            type="number"
          />
          {/* A full currency tick is as wide as its locale makes it, so the
              axis measures itself rather than clipping the widest one. */}
          <YAxis
            axisLine={false}
            dataKey="annualMinor"
            domain={[0, "auto"]}
            tickFormatter={(value: number) => formatCurrency(value, currency)}
            tickLine={false}
            type="number"
            width="auto"
          />
          <ChartTooltip
            content={
              <FrequencyCostTooltip config={config} currency={currency} />
            }
            cursor={{ strokeDasharray: "3 3" }}
          />
          {/* Recharts draws a circle by default, which is what these points are. */}
          {KINDS.map((kind) => (
            <Scatter
              data={points.filter((row) => row.kind === kind.key)}
              fill={`var(--color-${kind.key})`}
              key={kind.key}
              name={kind.key}
            />
          ))}
        </ScatterChart>
      </ChartContainer>
      <ul className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1">
        {KINDS.map((kind) => (
          <li
            className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
            key={kind.key}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: kind.color }}
            />
            {kind.label()}
          </li>
        ))}
      </ul>
    </figure>
  );
};

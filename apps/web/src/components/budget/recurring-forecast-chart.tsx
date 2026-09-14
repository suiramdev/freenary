import { ChartContainer, ChartTooltip } from "@freenary/ui/components/chart";
import type { ChartConfig } from "@freenary/ui/components/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/budget/format-currency";
import type { ForecastPoint } from "@/lib/budget/recurring";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

interface RecurringForecastChartProps {
  currency: string;
  points: ForecastPoint[];
}

/** One rendered day: the axis reads `day`, the tooltip reads the rest. */
interface ForecastRow {
  balanceMinor: number;
  day: number;
  dueLabels: string;
  dueMinor: number;
  label: string;
}

const BALANCE_KEY = "balanceMinor";

/** A tick every fifth day: thirty-one dates would overlap into a smear. */
const TICK_STEP = 5;

const AREA_FILL_OPACITY = 0.15;

const DAY_TICK: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/**
 * The last tick is centred on the final day and needs room to its right; the
 * self-measured value axis needs a little on the left.
 */
const CHART_MARGIN = { left: 6, right: 24, top: 4 };

/**
 * Recharts injects `active` and `payload`; the day's expected payments are a
 * second and a third fact about the point, which no default row carries.
 */
const ForecastTooltip = ({
  active,
  currency,
  payload,
}: {
  active?: boolean;
  currency: string;
  payload?: { payload?: ForecastRow }[];
}) => {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) {
    return null;
  }

  return (
    <div className="border-border/50 bg-background grid min-w-40 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{row.label}</div>
      <div className="flex items-center gap-2 leading-none">
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: CHART_COLOR_VARS.blue }}
        />
        <span className="text-muted-foreground flex-1">
          {m.budget_recurring_forecast_balance()}
        </span>
        <span className="text-foreground font-mono font-medium tabular-nums">
          {formatCurrency(row.balanceMinor, currency)}
        </span>
      </div>
      {row.dueMinor > 0 && (
        <div className="text-muted-foreground grid gap-0.5 leading-none">
          <span className="font-mono tabular-nums">
            {m.budget_recurring_upcoming_total({
              amount: formatCurrency(row.dueMinor, currency),
            })}
          </span>
          <span className="max-w-56 truncate">{row.dueLabels}</span>
        </div>
      )}
    </div>
  );
};

/**
 * The balance walked forward as expected payments land. The zero line is drawn
 * only when the forecast crosses it: "this runs out" is the whole point.
 */
export const RecurringForecastChart = ({
  currency,
  points,
}: RecurringForecastChartProps) => {
  if (points.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_recurring_forecast_empty()}
      </p>
    );
  }

  const locale = getLocale();
  const config: ChartConfig = {
    [BALANCE_KEY]: {
      color: CHART_COLOR_VARS.blue,
      label: m.budget_recurring_forecast_balance(),
    },
  };
  const today = m.budget_recurring_forecast_today();
  const rows: ForecastRow[] = points.map((point, index) => ({
    balanceMinor: point.balanceMinor,
    day: index,
    dueLabels: point.labels.join(" · "),
    dueMinor: point.dueMinor,
    label:
      index === 0 ? today : point.date.toLocaleDateString(locale, DAY_TICK),
  }));
  const runsOut = rows.some((row) => row.balanceMinor < 0);
  // `day` is the row's own index, so a tick every fifth day is arithmetic on it.
  const ticks = rows
    .map((row) => row.day)
    .filter((day) => day % TICK_STEP === 0 || day === rows.length - 1);

  return (
    // A figure with an sr-only caption, so the chart carries a name without a
    // `role` on a div.
    <figure className="h-full">
      <figcaption className="sr-only">
        {m.budget_recurring_forecast_chart_label()}
      </figcaption>
      <ChartContainer className="aspect-auto h-full w-full" config={config}>
        <AreaChart accessibilityLayer data={rows} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} />
          {/* Chosen ticks, then thinned again by `preserveStartEnd` when the
              card is too narrow to seat them all. */}
          <XAxis
            axisLine={false}
            dataKey="day"
            interval="preserveStartEnd"
            tickFormatter={(day: number) => rows[day]?.label ?? ""}
            tickLine={false}
            tickMargin={8}
            ticks={ticks}
          />
          {/* A full currency tick is as wide as its locale makes it, so the
              axis measures itself rather than clipping the widest one. */}
          <YAxis
            axisLine={false}
            tickFormatter={(value: number) => formatCurrency(value, currency)}
            tickLine={false}
            width="auto"
          />
          <ChartTooltip content={<ForecastTooltip currency={currency} />} />
          {runsOut && (
            <ReferenceLine
              stroke="var(--destructive)"
              strokeDasharray="4 4"
              y={0}
            />
          )}
          {/* Anchored at zero rather than at the lowest point: the fill then
              measures the cushion, or the hole, on either side of it. */}
          <Area
            baseValue={0}
            dataKey={BALANCE_KEY}
            dot={false}
            fill={`var(--color-${BALANCE_KEY})`}
            fillOpacity={AREA_FILL_OPACITY}
            isAnimationActive={false}
            name={BALANCE_KEY}
            stroke={`var(--color-${BALANCE_KEY})`}
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ChartContainer>
    </figure>
  );
};

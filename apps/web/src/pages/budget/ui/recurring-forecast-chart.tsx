import { Area, AreaChart } from "@freenary/ui/components/charts/area-chart";
import { Grid } from "@freenary/ui/components/charts/grid";
import {
  ChartTooltip,
  TooltipContent,
} from "@freenary/ui/components/charts/tooltip";
import { XAxis } from "@freenary/ui/components/charts/x-axis";
import { YAxis } from "@freenary/ui/components/charts/y-axis";
import { z } from "zod";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import {
  formatCompactCurrency,
  formatCurrency,
} from "@/shared/lib/format-currency";

import type { ForecastPoint } from "../model/recurring";

interface RecurringForecastChartProps {
  currency: string;
  points: ForecastPoint[];
}

interface ForecastRow extends Record<string, unknown> {
  balanceMinor: number;
  balanceText: string;
  date: Date;
  dueLabels: string;
  dueText: string;
  label: string;
}

const BALANCE_KEY = "balanceMinor";

const AREA_FILL_OPACITY = 0.25;

const DAY_TICK: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

const CHART_MARGIN = { bottom: 28, left: 48, right: 16, top: 8 };

const ZERO_BALANCE = [0];

const ZERO_LINE_DASH = "4,4";

const forecastTooltipSchema = z.object({
  balanceText: z.string(),
  dueLabels: z.string(),
  dueText: z.string(),
  label: z.string(),
});

const ForecastTooltip = ({ point }: { point: unknown }) => {
  const parsed = forecastTooltipSchema.safeParse(point);

  if (!parsed.success) {
    return null;
  }

  const row = parsed.data;

  return (
    <TooltipContent
      rows={[
        {
          color: CHART_COLOR_VARS.blue,
          label: m.budget_recurring_forecast_balance(),
          value: row.balanceText,
        },
      ]}
      title={row.label}
    >
      {row.dueText ? (
        <div className="text-chart-tooltip-muted grid max-w-56 gap-0.5 text-xs">
          <span className="font-mono tabular-nums">{row.dueText}</span>
          <span className="truncate">{row.dueLabels}</span>
        </div>
      ) : null}
    </TooltipContent>
  );
};

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
  const today = m.budget_recurring_forecast_today();
  const rows: ForecastRow[] = points.map((point, index) => ({
    balanceMinor: point.balanceMinor,
    balanceText: formatCurrency(point.balanceMinor, currency),
    date: point.date,
    dueLabels: point.labels.join(" · "),
    dueText:
      point.dueMinor > 0
        ? m.budget_recurring_upcoming_total({
            amount: formatCurrency(point.dueMinor, currency),
          })
        : "",
    label:
      index === 0 ? today : point.date.toLocaleDateString(locale, DAY_TICK),
  }));

  const labels = rows.map((row) => row.label);
  const runsOut = rows.some((row) => row.balanceMinor < 0);

  return (
    <figure className="flex h-full flex-col">
      <figcaption className="sr-only">
        {m.budget_recurring_forecast_chart_label()}
      </figcaption>
      <AreaChart
        aspectRatio="auto"
        className="min-h-0 flex-1"
        data={rows}
        margin={CHART_MARGIN}
      >
        <Grid
          highlightRowStroke="var(--destructive)"
          highlightRowStrokeDasharray={ZERO_LINE_DASH}
          highlightRowValues={runsOut ? ZERO_BALANCE : undefined}
          horizontal
        />
        <YAxis
          formatValue={(value) => formatCompactCurrency(value, currency)}
        />
        <Area
          dataKey={BALANCE_KEY}
          fill={CHART_COLOR_VARS.blue}
          fillOpacity={AREA_FILL_OPACITY}
          stroke={CHART_COLOR_VARS.blue}
        />
        <XAxis labels={labels} />
        <ChartTooltip
          content={ForecastTooltip}
          dateLabels={labels}
          showDatePill={false}
        />
      </AreaChart>
    </figure>
  );
};

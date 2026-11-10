import { Grid } from "@freenary/ui/components/charts/grid";
import { Line, LineChart } from "@freenary/ui/components/charts/line-chart";
import {
  ChartTooltip,
  TooltipContent,
} from "@freenary/ui/components/charts/tooltip";
import { XAxis } from "@freenary/ui/components/charts/x-axis";
import { useReducedMotion } from "motion/react";
import { z } from "zod";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import { formatCurrency } from "@/shared/lib/format-currency";

import type { PacePoint } from "../model/dashboard";

interface PaceRow extends Record<string, unknown> {
  currentMinor: number;
  currentText: string;
  date: Date;
  label: string;
  previousMinor: number;
  previousText: string;
}

const CURRENT_KEY = "currentMinor";
const PREVIOUS_KEY = "previousMinor";
const CURRENT_COLOR = CHART_COLOR_VARS.blue;
const PREVIOUS_COLOR = CHART_COLOR_VARS.grey;
const WHOLE_LINE_DASHED = 0;
const CHART_MARGIN = { bottom: 24, left: 24, right: 24, top: 8 };

const REVEAL_DURATION_MS = 1100;
const NO_REVEAL_MS = 0;

const DAY_LABEL: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
};

const paceTooltipSchema = z.object({
  currentText: z.string(),
  label: z.string(),
  previousText: z.string(),
});

const PaceTooltip = ({ point }: { point: unknown }) => {
  const parsed = paceTooltipSchema.safeParse(point);

  if (!parsed.success) {
    return null;
  }

  return (
    <TooltipContent
      rows={[
        {
          color: CURRENT_COLOR,
          label: m.home_spent_this_month_series(),
          value: parsed.data.currentText,
        },
        {
          color: PREVIOUS_COLOR,
          label: m.home_spent_last_month_series(),
          value: parsed.data.previousText,
        },
      ]}
      title={parsed.data.label}
    />
  );
};

const LegendSwatch = ({
  color,
  dashed,
}: {
  color: string;
  dashed: boolean;
}) => (
  <svg aria-hidden="true" className="shrink-0" height="2" width="16">
    <line
      stroke={color}
      strokeDasharray={dashed ? "4,3" : undefined}
      strokeWidth="2"
      x1="0"
      x2="16"
      y1="1"
      y2="1"
    />
  </svg>
);

export const SpendingPaceChart = ({
  currency,
  points,
  previousMonthTotalMinor,
  today,
}: {
  currency: string;
  points: PacePoint[];
  previousMonthTotalMinor: number;
  today: Date;
}) => {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const locale = getLocale();
  const rows: PaceRow[] = points.map((point) => {
    const date = new Date(today.getFullYear(), today.getMonth(), point.day);

    return {
      currentMinor: point.currentMinor,
      currentText: formatCurrency(point.currentMinor, currency),
      date,
      label: date.toLocaleDateString(locale, DAY_LABEL),
      previousMinor: point.previousMinor,
      previousText: formatCurrency(point.previousMinor, currency),
    };
  });

  const labels = rows.map((row) => row.label);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">{m.home_spent_chart_label()}</figcaption>
      <LineChart
        animationDuration={
          prefersReducedMotion ? NO_REVEAL_MS : REVEAL_DURATION_MS
        }
        aspectRatio="auto"
        className="h-32"
        data={rows}
        margin={CHART_MARGIN}
      >
        <Grid horizontal />
        <Line
          animate={!prefersReducedMotion}
          dashFromIndex={WHOLE_LINE_DASHED}
          dataKey={PREVIOUS_KEY}
          showHighlight={false}
          stroke={PREVIOUS_COLOR}
          strokeWidth={1.5}
        />
        <Line
          animate={!prefersReducedMotion}
          dataKey={CURRENT_KEY}
          stroke={CURRENT_COLOR}
        />
        <XAxis labels={labels} numTicks={3} />
        <ChartTooltip
          content={PaceTooltip}
          dateLabels={labels}
          showDatePill={false}
        />
      </LineChart>
      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <LegendSwatch color={CURRENT_COLOR} dashed={false} />
          {m.home_spent_this_month_series()}
        </li>
        <li className="flex items-center gap-1.5">
          <LegendSwatch color={PREVIOUS_COLOR} dashed />
          {m.home_spent_last_month_total({
            amount: formatCurrency(previousMonthTotalMinor, currency),
          })}
        </li>
      </ul>
    </figure>
  );
};

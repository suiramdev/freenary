import { Bar } from "@freenary/ui/components/charts/bar";
import { BarChart } from "@freenary/ui/components/charts/bar-chart";
import { BarYAxis } from "@freenary/ui/components/charts/bar-y-axis";
import { ChartTooltip } from "@freenary/ui/components/charts/tooltip";
import type { TooltipRow } from "@freenary/ui/components/charts/tooltip";
import { z } from "zod";

import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import { formatCurrency } from "@/shared/lib/format-currency";

import type { FrequencyRow } from "../model/recurring";

interface FrequencyCostChartProps {
  currency: string;
  points: FrequencyRow[];
}

interface CostRankRow extends Record<string, unknown> {
  behavioralMinor: number | null;
  fixedMinor: number | null;
  name: string;
  perYear: number;
}

const SERIES_BY_KIND = [
  {
    color: CHART_COLOR_VARS.blue,
    key: "fixed",
    label: m.budget_recurring_series_fixed,
    valueKey: "fixedMinor",
  },
  {
    color: CHART_COLOR_VARS.orange,
    key: "behavioral",
    label: m.budget_recurring_series_behavioral,
    valueKey: "behavioralMinor",
  },
] as const;

const MAX_RANKED_ROWS = 8;

const CHART_MARGIN = { bottom: 4, left: 84, right: 8, top: 4 };

const distinctName = (label: string, seen: Map<string, number>): string => {
  const count = (seen.get(label) ?? 0) + 1;
  seen.set(label, count);

  return count === 1 ? label : `${label} (${count})`;
};

const costRankRows = (points: FrequencyRow[]): CostRankRow[] => {
  const seen = new Map<string, number>();

  return points
    .toSorted((a, b) => b.annualMinor - a.annualMinor)
    .slice(0, MAX_RANKED_ROWS)
    .map((point) => ({
      behavioralMinor: point.kind === "behavioral" ? point.annualMinor : null,
      fixedMinor: point.kind === "fixed" ? point.annualMinor : null,
      name: distinctName(point.label, seen),
      perYear: point.perYear,
    }));
};

const costPointSchema = z.object({
  behavioralMinor: z.number().nullable(),
  fixedMinor: z.number().nullable(),
  perYear: z.number(),
});

const tooltipRows = (
  row: z.infer<typeof costPointSchema> | undefined,
  currency: string
): TooltipRow[] =>
  row === undefined
    ? []
    : SERIES_BY_KIND.flatMap((series) => {
        const annualMinor = row[series.valueKey];

        return annualMinor === null
          ? []
          : [
              {
                color: series.color,
                label: m.budget_recurring_per_year({
                  count: Math.round(row.perYear),
                }),
                value: formatCurrency(annualMinor, currency),
              },
            ];
      });

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

  const rows = costRankRows(points);

  return (
    <figure className="flex h-full flex-col gap-2">
      <figcaption className="sr-only">
        {m.budget_recurring_cost_rank_chart_label()}
      </figcaption>
      <BarChart
        aspectRatio="auto"
        className="min-h-0 flex-1"
        data={rows}
        margin={CHART_MARGIN}
        orientation="horizontal"
        stacked
        xDataKey="name"
      >
        {SERIES_BY_KIND.map((series) => (
          <Bar
            dataKey={series.valueKey}
            fill={series.color}
            key={series.key}
            lineCap="butt"
            showValue
            valueLabelFormatter={(value) => formatCurrency(value, currency)}
            valueLabelPosition="top"
          />
        ))}
        <BarYAxis />
        <ChartTooltip
          rows={(point) =>
            tooltipRows(costPointSchema.safeParse(point).data, currency)
          }
        />
      </BarChart>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1">
        <ul className="contents">
          {SERIES_BY_KIND.map((series) => (
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
        {points.length > rows.length ? (
          <p className="text-muted-foreground text-[11px]">
            {m.budget_recurring_cost_rank_top({
              shown: rows.length,
              total: points.length,
            })}
          </p>
        ) : null}
      </div>
    </figure>
  );
};

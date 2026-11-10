import { ASSISTANT_UI } from "@freenary/api/assistant/ui";
import { Bar } from "@freenary/ui/components/charts/bar";
import { BarChart } from "@freenary/ui/components/charts/bar-chart";
import { BarXAxis } from "@freenary/ui/components/charts/bar-x-axis";
import { Grid } from "@freenary/ui/components/charts/grid";
import { Line, LineChart } from "@freenary/ui/components/charts/line-chart";
import { PieChart } from "@freenary/ui/components/charts/pie-chart";
import type { PieData } from "@freenary/ui/components/charts/pie-context";
import { PieSlice } from "@freenary/ui/components/charts/pie-slice";
import {
  ChartTooltip,
  TooltipContent,
} from "@freenary/ui/components/charts/tooltip";
import type { TooltipRow } from "@freenary/ui/components/charts/tooltip";
import { XAxis } from "@freenary/ui/components/charts/x-axis";
import { YAxis } from "@freenary/ui/components/charts/y-axis";
import { createLibrary, defineComponent } from "@openuidev/react-lang";
import type { LibraryDefinition } from "@openuidev/react-lang";
import { useState } from "react";
import { z } from "zod";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";

interface Series {
  name: string;
  values: number[];
}

interface SeriesRow extends Record<string, unknown> {
  label: string;
  tooltipRows: TooltipRow[];
}

interface LineRow extends SeriesRow {
  date: Date;
}

interface Slice extends PieData {
  color: string;
  key: string;
}

const PALETTE = [
  CHART_COLOR_VARS.blue,
  CHART_COLOR_VARS.orange,
  CHART_COLOR_VARS.green,
  CHART_COLOR_VARS.purple,
  CHART_COLOR_VARS.pink,
  CHART_COLOR_VARS.red,
  CHART_COLOR_VARS.grey,
];

const ISO_CURRENCY_CODE = /^[A-Z]{3}$/u;

const CHART_HEIGHT_CLASS = "h-56 w-full";

const CHART_MARGIN = { bottom: 28, left: 56, right: 8, top: 8 };

const DONUT_SIZE = 160;

const DONUT_INNER_RADIUS = 40;

const LINE_EPOCH_YEAR = 2000;

const currencyOf = (code: string | undefined): string | undefined =>
  code !== undefined && ISO_CURRENCY_CODE.test(code) ? code : undefined;

const currencyStyle = (currency: string | undefined) =>
  currency === undefined ? {} : { currency, style: "currency" as const };

const formatDecimalCurrency = (
  value: number,
  currency: string | undefined
): string =>
  new Intl.NumberFormat(getLocale(), currencyStyle(currency)).format(value);

const compactCurrency = (value: number, currency: string | undefined): string =>
  new Intl.NumberFormat(getLocale(), {
    ...currencyStyle(currency),
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);

const seriesKey = (index: number): string => `s${index}`;

const seriesColor = (index: number): string =>
  PALETTE[index % PALETTE.length] ?? CHART_COLOR_VARS.grey;

const seriesTooltipRows = (
  series: Series[],
  index: number,
  currency: string | undefined
): TooltipRow[] =>
  series.flatMap((entry, seriesIndex) => {
    const value = entry.values[index];

    return value === undefined
      ? []
      : [
          {
            color: seriesColor(seriesIndex),
            label: entry.name,
            value: formatDecimalCurrency(value, currency),
          },
        ];
  });

const toRowsWithGaps = (
  labels: string[],
  series: Series[],
  currency: string | undefined
): SeriesRow[] =>
  labels.map((label, index) => ({
    label,
    tooltipRows: seriesTooltipRows(series, index, currency),
    ...Object.fromEntries(
      series.map((entry, seriesIndex) => [
        seriesKey(seriesIndex),
        entry.values[index] ?? null,
      ])
    ),
  }));

const nearestDefined = (
  values: number[],
  index: number,
  step: 1 | -1
): { at: number; value: number } | undefined => {
  for (let at = index; at >= 0 && at < values.length; at += step) {
    const value = values[at];

    if (value !== undefined) {
      return { at, value };
    }
  }

  return undefined;
};

const valueOrInterpolated = (values: number[], index: number): number => {
  const before = nearestDefined(values, index, -1);
  const after = nearestDefined(values, index, 1);

  if (before && after && after.at !== before.at) {
    const progress = (index - before.at) / (after.at - before.at);

    return before.value + (after.value - before.value) * progress;
  }

  return before?.value ?? after?.value ?? 0;
};

const toLineRows = (
  labels: string[],
  series: Series[],
  currency: string | undefined
): LineRow[] =>
  labels.map((label, index) => ({
    date: new Date(LINE_EPOCH_YEAR, 0, index + 1),
    label,
    tooltipRows: seriesTooltipRows(series, index, currency),
    ...Object.fromEntries(
      series.map((entry, seriesIndex) => [
        seriesKey(seriesIndex),
        valueOrInterpolated(entry.values, index),
      ])
    ),
  }));

const seriesPointSchema = z.object({
  label: z.string(),
  tooltipRows: z.array(
    z.object({ color: z.string(), label: z.string(), value: z.string() })
  ),
});

const LineTooltip = ({ point }: { point: unknown }) => {
  const parsed = seriesPointSchema.safeParse(point);

  return parsed.success ? (
    <TooltipContent rows={parsed.data.tooltipRows} title={parsed.data.label} />
  ) : null;
};

const SeriesLegend = ({ series }: { series: Series[] }) =>
  series.length > 1 ? (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1">
      {series.map((entry, index) => (
        <li
          className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
          key={seriesKey(index)}
        >
          <span
            className="size-2 shrink-0 rounded-[1px]"
            style={{ backgroundColor: seriesColor(index) }}
          />
          {entry.name}
        </li>
      ))}
    </ul>
  ) : null;

const DonutBody = ({
  currency,
  slices,
}: {
  currency: string | undefined;
  slices: Slice[];
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const hovered = hoveredIndex === null ? undefined : slices[hoveredIndex];
  const share =
    hovered && total > 0 ? Math.round((hovered.value / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-10">
      <div className="relative shrink-0">
        <PieChart
          data={slices}
          hoveredIndex={hoveredIndex}
          innerRadius={DONUT_INNER_RADIUS}
          onHoverChange={setHoveredIndex}
          size={DONUT_SIZE}
        >
          {slices.map((slice, index) => (
            <PieSlice hoverEffect="grow" index={index} key={slice.key} />
          ))}
        </PieChart>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="flex max-w-18 flex-col items-center gap-0.5 text-center">
            <span className="font-mono text-[11px] font-medium tabular-nums">
              {compactCurrency(hovered?.value ?? total, currency)}
            </span>
            <span className="text-muted-foreground max-w-full truncate text-[10px] leading-tight">
              {hovered ? `${hovered.label} · ${share}%` : m.chart_total()}
            </span>
          </div>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 sm:flex-col">
        {slices.map((slice, index) => (
          <li
            className="flex items-center gap-1.5 font-mono text-[11px]"
            key={slice.key}
            onPointerEnter={() => setHoveredIndex(index)}
            onPointerLeave={() => setHoveredIndex(null)}
          >
            <span
              className="size-2 rounded-[1px]"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-muted-foreground">{slice.label}</span>
            <span>{formatDecimalCurrency(slice.value, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Stat = defineComponent({
  ...ASSISTANT_UI.Stat,
  component: ({ props }) => (
    <div className="flex min-w-32 flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <span className="font-mono text-lg tabular-nums">
        {formatDecimalCurrency(props.value, currencyOf(props.currency))}
      </span>
    </div>
  ),
});

const AssistantBarChart = defineComponent({
  ...ASSISTANT_UI.BarChart,
  component: ({ props }) => {
    const currency = currencyOf(props.currency);

    return (
      <div className="flex flex-col gap-2">
        <BarChart
          aspectRatio="auto"
          className={CHART_HEIGHT_CLASS}
          data={toRowsWithGaps(props.labels, props.series, currency)}
          margin={CHART_MARGIN}
          xDataKey="label"
        >
          <Grid horizontal />
          <YAxis formatValue={(value) => compactCurrency(value, currency)} />
          {props.series.map((_entry, index) => (
            <Bar
              dataKey={seriesKey(index)}
              fill={seriesColor(index)}
              key={seriesKey(index)}
            />
          ))}
          <BarXAxis />
          <ChartTooltip
            rows={(point) =>
              seriesPointSchema.safeParse(point).data?.tooltipRows ?? []
            }
            showDatePill={false}
          />
        </BarChart>
        <SeriesLegend series={props.series} />
      </div>
    );
  },
});

const AssistantLineChart = defineComponent({
  ...ASSISTANT_UI.LineChart,
  component: ({ props }) => {
    const currency = currencyOf(props.currency);

    return (
      <div className="flex flex-col gap-2">
        <LineChart
          aspectRatio="auto"
          className={CHART_HEIGHT_CLASS}
          data={toLineRows(props.labels, props.series, currency)}
          margin={CHART_MARGIN}
        >
          <Grid horizontal />
          <YAxis formatValue={(value) => compactCurrency(value, currency)} />
          {props.series.map((_entry, index) => (
            <Line
              dataKey={seriesKey(index)}
              key={seriesKey(index)}
              stroke={seriesColor(index)}
            />
          ))}
          <XAxis labels={props.labels} />
          <ChartTooltip
            content={LineTooltip}
            dateLabels={props.labels}
            showDatePill={false}
          />
        </LineChart>
        <SeriesLegend series={props.series} />
      </div>
    );
  },
});

const AssistantDonutChart = defineComponent({
  ...ASSISTANT_UI.DonutChart,
  component: ({ props }) => (
    <DonutBody
      currency={currencyOf(props.currency)}
      slices={props.labels.flatMap((label, index) => {
        const value = props.values[index];

        return value === undefined
          ? []
          : [
              {
                color: seriesColor(index),
                key: seriesKey(index),
                label,
                value,
              },
            ];
      })}
    />
  ),
});

const Card = defineComponent({
  ...ASSISTANT_UI.Card,
  component: ({ props, renderNode }) => {
    const stats = props.children.filter((child) => child.typeName === "Stat");
    const charts = props.children.filter((child) => child.typeName !== "Stat");

    return (
      <section className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-4">
        <h3 className="text-sm font-medium">{props.title}</h3>
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {renderNode(stats)}
          </div>
        )}
        {renderNode(charts)}
      </section>
    );
  },
});

const components = {
  BarChart: AssistantBarChart,
  Card,
  DonutChart: AssistantDonutChart,
  LineChart: AssistantLineChart,
  Stat,
} satisfies Record<
  keyof typeof ASSISTANT_UI,
  LibraryDefinition["components"][number]
>;

export const assistantUiLibrary = createLibrary({
  components: Object.values(components),
  root: "Card",
});

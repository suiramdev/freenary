import { Bar } from "@freenary/ui/components/charts/bar";
import { BarChart } from "@freenary/ui/components/charts/bar-chart";
import { BarYAxis } from "@freenary/ui/components/charts/bar-y-axis";
import { useChart } from "@freenary/ui/components/charts/chart-context";
import { Grid } from "@freenary/ui/components/charts/grid";
import { ChartTooltip } from "@freenary/ui/components/charts/tooltip";
import type { TooltipRow } from "@freenary/ui/components/charts/tooltip";
import { ScrollArea } from "@freenary/ui/components/scroll-area";
import { useMemo } from "react";

export interface RankedBar {
  color: string;
  label: string;
  tooltipRows: TooltipRow[];
  value: number;
  valueLabel: string;
}

interface RankedBarChartProps {
  bars: RankedBar[];
  label: string;
}

interface RankedRow extends Record<string, unknown> {
  name: string;
}

interface ColorSeries {
  color: string;
  key: string;
}

const ROW_HEIGHT_PX = 28;
const BAR_GAP = 0.4;
const CHART_MARGIN = { bottom: 4, left: 92, right: 72, top: 4 };
const END_LABEL_INSET_PX = 6;
const DUPLICATE_SEPARATOR = " ";

const uniqueNames = (bars: RankedBar[]) => {
  const seen = new Map<string, number>();

  return bars.map((entry) => {
    const count = (seen.get(entry.label) ?? 0) + 1;
    seen.set(entry.label, count);

    return count === 1
      ? entry.label
      : `${entry.label}${DUPLICATE_SEPARATOR}(${count})`;
  });
};

const seriesByColor = (bars: RankedBar[]) => {
  const series = new Map<string, ColorSeries>();

  for (const entry of bars) {
    if (!series.has(entry.color)) {
      series.set(entry.color, {
        color: entry.color,
        key: `series${series.size}`,
      });
    }
  }

  return series;
};

const BarEndLabels = ({ bars }: { bars: RankedBar[] }) => {
  const {
    bandWidth,
    barScale,
    barXAccessor,
    data: chartRows,
    yScale,
  } = useChart();

  if (!(barScale && barXAccessor && bandWidth)) {
    return null;
  }

  return (
    <g className="pointer-events-none">
      {chartRows.map((row, index) => {
        const name = barXAccessor(row);
        const entry = bars[index];

        return (
          entry && (
            <text
              className="fill-muted-foreground font-mono text-[11px] tabular-nums"
              dominantBaseline="central"
              key={name}
              x={(yScale(entry.value) ?? 0) + END_LABEL_INSET_PX}
              y={(barScale(name) ?? 0) + bandWidth / 2}
            >
              {entry.valueLabel}
            </text>
          )
        );
      })}
    </g>
  );
};

export const RankedBarChart = ({ bars, label }: RankedBarChartProps) => {
  const { rows, series, tooltipRowsByName } = useMemo(() => {
    const names = uniqueNames(bars);
    const colorSeries = seriesByColor(bars);

    return {
      rows: bars.map((entry, index): RankedRow => {
        const key = colorSeries.get(entry.color)?.key ?? "series0";

        return { [key]: entry.value, name: names[index] ?? entry.label };
      }),
      series: [...colorSeries.values()],
      tooltipRowsByName: new Map(
        bars.map((entry, index) => [
          names[index] ?? entry.label,
          entry.tooltipRows,
        ])
      ),
    };
  }, [bars]);

  const chartHeight =
    rows.length * ROW_HEIGHT_PX + CHART_MARGIN.top + CHART_MARGIN.bottom;

  return (
    <figure className="h-full">
      <figcaption className="sr-only">{label}</figcaption>
      <ScrollArea className="h-full">
        <div style={{ height: chartHeight }}>
          <BarChart
            aspectRatio="auto"
            barGap={BAR_GAP}
            className="h-full"
            data={rows}
            margin={CHART_MARGIN}
            orientation="horizontal"
            stacked
            xDataKey="name"
          >
            <Grid horizontal={false} vertical />
            {series.map((entry) => (
              <Bar
                dataKey={entry.key}
                fill={entry.color}
                key={entry.key}
                lineCap="butt"
              />
            ))}
            <BarYAxis />
            <BarEndLabels bars={bars} />
            <ChartTooltip
              rows={(point) => tooltipRowsByName.get(String(point.name)) ?? []}
              showCrosshair={false}
              showDatePill={false}
            />
          </BarChart>
        </div>
      </ScrollArea>
    </figure>
  );
};

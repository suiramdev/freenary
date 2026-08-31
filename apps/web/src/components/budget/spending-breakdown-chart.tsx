import {
  CATEGORY_GROUP_COLORS,
  CATEGORY_GROUP_LABELS,
} from "@freenary/api/lib/taxonomy";
import type { CategoryGroup } from "@freenary/api/lib/taxonomy";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { useCallback } from "react";

import { BlockLegend } from "@/components/dither-kit/block-legend";
import type { ChartConfig } from "@/components/dither-kit/chart-context";
import { Pie } from "@/components/dither-kit/pie";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Tooltip } from "@/components/dither-kit/tooltip";
import type { CategorySelection } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import { AGGREGATION_LABELS } from "@/lib/budget/period";
import type { AggregationMode } from "@/lib/budget/period";

/** One slice: a category group's spending for the period. */
interface GroupData {
  amount: number;
  group: CategoryGroup;
  label: string;
}

interface SpendingBreakdownChartProps {
  aggregation: AggregationMode;
  data: GroupData[];
  className?: string;
  onSelect?: (selection: CategorySelection | null) => void;
}

const buildConfig = (data: GroupData[]): ChartConfig => {
  const config: ChartConfig = {};
  for (const d of data) {
    config[d.label] = {
      color: CATEGORY_GROUP_COLORS[d.group],
      label: CATEGORY_GROUP_LABELS[d.group],
    };
  }
  return config;
};

/**
 * The spending split by group. Groups, not categories: seventy-five slices
 * would carry less than the sixteen do, and the Sankey already shows detail.
 */
export const SpendingBreakdownChart = ({
  aggregation,
  data,
  className,
  onSelect,
}: SpendingBreakdownChartProps) => {
  const config = buildConfig(data);

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const values: Record<string, number> = {};
  for (const d of data) {
    values[d.label] = d.amount;
  }

  const selectByLabel = useCallback(
    (label: string | null) => {
      if (!onSelect) {
        return;
      }
      if (!label) {
        onSelect(null);
        return;
      }
      const entry = data.find((d) => d.label === label);
      if (entry) {
        onSelect({ group: entry.group, kind: "group" });
      }
    },
    [data, onSelect]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          Spending Breakdown
          {aggregation !== "total" && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · {AGGREGATION_LABELS[aggregation]}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PieChart
          data={data}
          config={config}
          dataKey="amount"
          nameKey="label"
          innerRadius={0.55}
          className="mx-auto aspect-square h-auto w-full max-w-[200px]"
          onSelectionChange={selectByLabel}
        >
          <Pie variant="gradient" />
          <Tooltip
            valueFormatter={(v) =>
              `${formatCurrency(v)} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`
            }
          />
        </PieChart>
        <BlockLegend
          config={config}
          values={values}
          valueFormatter={(v) => formatCurrency(v)}
          align="start"
          onItemClick={onSelect ? selectByLabel : undefined}
        />
      </CardContent>
    </Card>
  );
};

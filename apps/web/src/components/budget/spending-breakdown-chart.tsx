import { CATEGORY_GROUP_COLORS } from "@freenary/api/lib/taxonomy";
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
import { aggregationLabel } from "@/lib/budget/period";
import type { AggregationMode } from "@/lib/budget/period";
import { categoryGroupLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

/** One slice: a category group's spending for the period. */
interface GroupData {
  amount: number;
  group: CategoryGroup;
}

interface SpendingBreakdownChartProps {
  aggregation: AggregationMode;
  data: GroupData[];
  className?: string;
  onSelect?: (selection: CategorySelection | null) => void;
}

// Keyed by the group slug, never the display name: the label is translated,
// so it changes with the locale while the identity must not.
const buildConfig = (data: GroupData[]): ChartConfig => {
  const config: ChartConfig = {};
  for (const d of data) {
    config[d.group] = {
      color: CATEGORY_GROUP_COLORS[d.group],
      label: categoryGroupLabel(d.group),
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
    values[d.group] = d.amount;
  }

  const selectByGroup = useCallback(
    (group: string | null) => {
      if (!onSelect) {
        return;
      }
      if (!group) {
        onSelect(null);
        return;
      }
      const entry = data.find((d) => d.group === group);
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
          {m.budget_breakdown_title()}
          {aggregation !== "total" && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · {aggregationLabel(aggregation)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PieChart
          data={data}
          config={config}
          dataKey="amount"
          nameKey="group"
          innerRadius={0.55}
          className="mx-auto aspect-square h-auto w-full max-w-[200px]"
          onSelectionChange={selectByGroup}
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
          onItemClick={onSelect ? selectByGroup : undefined}
        />
      </CardContent>
    </Card>
  );
};

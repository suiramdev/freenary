import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";

import { BlockLegend } from "@/components/dither-kit/block-legend";
import type { ChartConfig } from "@/components/dither-kit/chart-context";
import { Pie } from "@/components/dither-kit/pie";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Tooltip } from "@/components/dither-kit/tooltip";

import { formatCurrency } from "./format-currency";

interface CategoryData {
  amount: number;
  category: SpendingCategory;
  label: string;
}

interface SpendingBreakdownChartProps {
  data: CategoryData[];
  className?: string;
}

const buildConfig = (data: CategoryData[]): ChartConfig => {
  const config: ChartConfig = {};
  for (const d of data) {
    config[d.label] = {
      color: CATEGORY_COLORS[d.category],
      label: CATEGORY_LABELS[d.category],
    };
  }
  return config;
};

export const SpendingBreakdownChart = ({
  data,
  className,
}: SpendingBreakdownChartProps) => {
  const config = buildConfig(data);

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const values: Record<string, number> = {};
  for (const d of data) {
    values[d.label] = d.amount;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xs font-medium">
          Spending Breakdown
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
        />
      </CardContent>
    </Card>
  );
};

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";

import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Grid } from "@/components/dither-kit/grid";
import { Legend } from "@/components/dither-kit/legend";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";

import { formatCurrency } from "./format-currency";

interface CashFlowChartProps {
  data: { label: string; incoming: number; outgoing: number }[];
  className?: string;
  formatValue?: (amount: number) => string;
}

const CASH_FLOW_CONFIG = {
  incoming: { color: "green" as const, label: "Incoming" },
  outgoing: { color: "pink" as const, label: "Outgoing" },
};

const defaultFormatValue = (amount: number) => formatCurrency(amount);

export const CashFlowChart = ({
  data,
  className,
  formatValue = defaultFormatValue,
}: CashFlowChartProps) => {
  const chartData = data.map((d) => ({
    incoming: d.incoming,
    label: d.label,
    outgoing: Math.abs(d.outgoing),
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xs font-medium">Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChart
          data={chartData}
          config={CASH_FLOW_CONFIG}
          className="h-[200px] w-full"
        >
          <Grid />
          <Bar dataKey="incoming" />
          <Bar dataKey="outgoing" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(v) => formatValue(v)} />
          <Legend />
          <Tooltip valueFormatter={(v) => formatValue(v)} />
        </BarChart>
      </CardContent>
    </Card>
  );
};

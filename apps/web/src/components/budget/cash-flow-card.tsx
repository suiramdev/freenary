import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { useMemo } from "react";

import { CashFlowSummary } from "@/components/budget/cash-flow-summary";
import { SankeyChart } from "@/components/shared/sankey-chart";
import { toCashFlowSankey } from "@/lib/budget/cash-flow-sankey";
import type { CashFlowData } from "@/lib/budget/cash-flow-sankey";
import { formatCurrency } from "@/lib/budget/format-currency";

interface CashFlowCardProps extends CashFlowData {
  className?: string;
  totalExpenses: number;
}

/** Where a period's money came from and where it went. */
export const CashFlowCard = ({
  className,
  expenseLinks,
  expenseNodes,
  incomeLinks,
  incomeNodes,
  totalExpenses,
  totalIncome,
}: CashFlowCardProps) => {
  const flow = useMemo(
    () =>
      toCashFlowSankey({
        expenseLinks,
        expenseNodes,
        incomeLinks,
        incomeNodes,
        totalIncome,
      }),
    [expenseLinks, expenseNodes, incomeLinks, incomeNodes, totalIncome]
  );

  if (incomeNodes.length === 0 && expenseNodes.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xs font-medium">Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <SankeyChart
          formatValue={formatCurrency}
          hub={flow.hub}
          label="Cash flow from income sources through the budget to spending categories"
          links={flow.links}
          sources={flow.sources}
          targets={flow.targets}
        />
        <CashFlowSummary
          totalExpenses={totalExpenses}
          totalIncome={totalIncome}
        />
      </CardContent>
    </Card>
  );
};

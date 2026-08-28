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
import { AGGREGATION_LABELS } from "@/lib/budget/period";
import type { AggregationMode } from "@/lib/budget/period";
import { formatCurrency } from "@/lib/budget/format-currency";

interface CashFlowCardProps extends CashFlowData {
  aggregation: AggregationMode;
  className?: string;
  totalExpenses: number;
}

/** Where a period's money came from and where it went. */
export const CashFlowCard = ({
  aggregation,
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
        <CardTitle className="text-xs font-medium">
          Cash Flow
          {aggregation !== "total" && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · {AGGREGATION_LABELS[aggregation]}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SankeyChart
          columns={flow.columns}
          emphasizedId={flow.emphasizedId}
          formatValue={formatCurrency}
          label="Cash flow from income sources through the budget to spending categories"
          links={flow.links}
        />
        <CashFlowSummary
          aggregation={aggregation}
          totalExpenses={totalExpenses}
          totalIncome={totalIncome}
        />
      </CardContent>
    </Card>
  );
};

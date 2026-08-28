import { CATEGORY_LABELS } from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { useCallback, useMemo } from "react";

import { CashFlowSummary } from "@/components/budget/cash-flow-summary";
import { SankeyChart } from "@/components/shared/sankey-chart";
import { toCashFlowSankey } from "@/lib/budget/cash-flow-sankey";
import type { CashFlowData } from "@/lib/budget/cash-flow-sankey";
import { formatCurrency } from "@/lib/budget/format-currency";
import { AGGREGATION_LABELS } from "@/lib/budget/period";
import type { AggregationMode } from "@/lib/budget/period";

const LABEL_TO_CATEGORY: Record<string, SpendingCategory> = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([slug, label]) => [label, slug])
) as Record<string, SpendingCategory>;

interface CashFlowCardProps extends CashFlowData {
  aggregation: AggregationMode;
  className?: string;
  onCategoryClick?: (category: SpendingCategory) => void;
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
  onCategoryClick,
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

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!onCategoryClick || !nodeId.startsWith("expense:")) {return;}
      const label = nodeId.slice("expense:".length);
      const category = LABEL_TO_CATEGORY[label];
      if (category) {onCategoryClick(category);}
    },
    [onCategoryClick]
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
          onNodeClick={onCategoryClick ? handleNodeClick : undefined}
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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import { useCallback, useMemo } from "react";

import { CashFlowSummary } from "@/components/budget/cash-flow-summary";
import { SankeyChart } from "@/components/shared/sankey-chart";
import {
  selectionOfNodeId,
  toCashFlowSankey,
} from "@/lib/budget/cash-flow-sankey";
import type { CashFlowData } from "@/lib/budget/cash-flow-sankey";
import type { CategorySelection } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import { AGGREGATION_LABELS } from "@/lib/budget/period";
import type { AggregationMode } from "@/lib/budget/period";

interface CashFlowCardProps extends CashFlowData {
  aggregation: AggregationMode;
  className?: string;
  onSelect?: (selection: CategorySelection) => void;
  totalExpenses: number;
}

/** Where a period's money came from and where it went. */
export const CashFlowCard = ({
  aggregation,
  className,
  groups,
  incomeNodes,
  moneyLeft,
  onSelect,
  totalExpenses,
  totalIncome,
}: CashFlowCardProps) => {
  const flow = useMemo(
    () => toCashFlowSankey({ groups, incomeNodes, moneyLeft, totalIncome }),
    [groups, incomeNodes, moneyLeft, totalIncome]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const selection = selectionOfNodeId(nodeId);
      if (selection && onSelect) {
        onSelect(selection);
      }
    },
    [onSelect]
  );

  if (incomeNodes.length === 0 && groups.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
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
          formatValue={formatCurrency}
          label="Cash flow from income sources to category groups and their categories"
          links={flow.links}
          onNodeClick={onSelect ? handleNodeClick : undefined}
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

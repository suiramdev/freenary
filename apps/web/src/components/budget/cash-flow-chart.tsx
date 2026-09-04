import { useCallback, useMemo } from "react";

import { SankeyChart } from "@/components/shared/sankey-chart";
import {
  selectionOfNodeId,
  toCashFlowSankey,
} from "@/lib/budget/cash-flow-sankey";
import type { CashFlowData } from "@/lib/budget/cash-flow-sankey";
import type { CategorySelection } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import { m } from "@/paraglide/messages.js";

interface CashFlowChartProps extends CashFlowData {
  onSelect?: (selection: CategorySelection) => void;
}

/**
 * Where a period's money came from and where it went. A chart body only: the
 * surrounding card, its title and the view switch belong to `BudgetCharts`.
 */
export const CashFlowChart = ({
  groups,
  incomeNodes,
  moneyLeft,
  onSelect,
  totalIncome,
}: CashFlowChartProps) => {
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
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_cash_flow_empty()}
      </p>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      {/* The svg keeps its own aspect ratio and letterboxes inside the slot,
          so switching views never changes the card's height. */}
      <SankeyChart
        className="max-h-full"
        columns={flow.columns}
        formatValue={formatCurrency}
        label={m.budget_cash_flow_chart_label()}
        links={flow.links}
        onNodeClick={onSelect ? handleNodeClick : undefined}
      />
    </div>
  );
};

import { Skeleton } from "@freenary/ui/components/skeleton";
import type { ComponentProps } from "react";

import { CashFlowCard } from "@/components/budget/cash-flow-card";
import { SpendingBreakdownChart } from "@/components/budget/spending-breakdown-chart";
import type { CategorySelection } from "@/lib/budget/category-selection";
import type { AggregationMode } from "@/lib/budget/period";
import { m } from "@/paraglide/messages.js";

interface BudgetChartsProps {
  aggregation: AggregationMode;
  breakdown: ComponentProps<typeof SpendingBreakdownChart>["data"] | undefined;
  cashFlow:
    | Omit<ComponentProps<typeof CashFlowCard>, "aggregation">
    | undefined;
  isBreakdownPending: boolean;
  isCashFlowPending: boolean;
  onSelect: (selection: CategorySelection | null) => void;
}

/**
 * Where the period's money flowed, and what the spending split was. Each half
 * is skeletoned only while its own query is in flight, so a failed one leaves
 * a gap rather than a placeholder that never resolves.
 */
export const BudgetCharts = ({
  aggregation,
  breakdown,
  cashFlow,
  isBreakdownPending,
  isCashFlowPending,
  onSelect,
}: BudgetChartsProps) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
    {isCashFlowPending ? (
      <div aria-busy="true">
        <output className="sr-only">{m.budget_cash_flow_loading()}</output>
        <Skeleton aria-hidden="true" className="h-[280px]" />
      </div>
    ) : null}

    {cashFlow && !isCashFlowPending ? (
      <CashFlowCard
        {...cashFlow}
        aggregation={aggregation}
        onSelect={onSelect}
      />
    ) : null}

    {isBreakdownPending ? (
      <div aria-busy="true">
        <output className="sr-only">{m.budget_breakdown_loading()}</output>
        <Skeleton aria-hidden="true" className="h-[320px]" />
      </div>
    ) : null}

    {/* A period with nothing spent has no split to draw. */}
    {breakdown?.length && !isBreakdownPending ? (
      <SpendingBreakdownChart
        aggregation={aggregation}
        data={breakdown}
        onSelect={onSelect}
      />
    ) : null}
  </div>
);

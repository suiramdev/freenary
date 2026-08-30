import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import { Skeleton } from "@freenary/ui/components/skeleton";
import type { ComponentProps } from "react";

import { CashFlowCard } from "@/components/budget/cash-flow-card";
import { SpendingBreakdownChart } from "@/components/budget/spending-breakdown-chart";
import type { AggregationMode } from "@/lib/budget/period";

interface BudgetChartsProps {
  aggregation: AggregationMode;
  breakdown: ComponentProps<typeof SpendingBreakdownChart>["data"] | undefined;
  cashFlow:
    | Omit<ComponentProps<typeof CashFlowCard>, "aggregation">
    | undefined;
  isBreakdownPending: boolean;
  isCashFlowPending: boolean;
  onCategoryClick: (category: SpendingCategory | null) => void;
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
  onCategoryClick,
}: BudgetChartsProps) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
    {isCashFlowPending ? (
      <div aria-busy="true">
        <output className="sr-only">Loading cash flow</output>
        <Skeleton aria-hidden="true" className="h-[280px]" />
      </div>
    ) : null}

    {cashFlow && !isCashFlowPending ? (
      <CashFlowCard
        {...cashFlow}
        aggregation={aggregation}
        onCategoryClick={onCategoryClick}
      />
    ) : null}

    {isBreakdownPending ? (
      <div aria-busy="true">
        <output className="sr-only">Loading spending breakdown</output>
        <Skeleton aria-hidden="true" className="h-[320px]" />
      </div>
    ) : null}

    {/* A period with nothing spent has no split to draw. */}
    {breakdown?.length && !isBreakdownPending ? (
      <SpendingBreakdownChart
        aggregation={aggregation}
        data={breakdown}
        onCategoryClick={onCategoryClick}
      />
    ) : null}
  </div>
);

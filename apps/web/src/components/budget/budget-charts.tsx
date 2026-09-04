import type { CategoryGroup } from "@freenary/api/lib/taxonomy";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@freenary/ui/components/select";
import { Skeleton } from "@freenary/ui/components/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@freenary/ui/components/toggle-group";
import type { ComponentProps } from "react";

import { BudgetVsActualChart } from "@/components/budget/budget-vs-actual-chart";
import { CashFlowChart } from "@/components/budget/cash-flow-chart";
import { FixedVsVariableChart } from "@/components/budget/fixed-vs-variable-chart";
import { SpendingBreakdownChart } from "@/components/budget/spending-breakdown-chart";
import type { CashFlowData } from "@/lib/budget/cash-flow-sankey";
import type { CategorySelection } from "@/lib/budget/category-selection";
import { aggregationLabel } from "@/lib/budget/period";
import type { AggregationMode } from "@/lib/budget/period";
import type { CompanionView, PrimaryView } from "@/lib/budget/search";
import { m } from "@/paraglide/messages.js";

type BreakdownData = ComponentProps<typeof SpendingBreakdownChart>["data"];
type PlannedData = Pick<
  ComponentProps<typeof BudgetVsActualChart>,
  "groups" | "hasPlan"
>;
type FixedData = ComponentProps<typeof FixedVsVariableChart>;

/**
 * Every view of a position draws inside the same box, so switching one never
 * moves the transaction list below.
 */
const CHART_BODY = "h-[280px]";

const PRESS = "transition-transform duration-150 ease-out active:scale-[0.96]";

/** What a position knows about its query: nothing yet, a failure, or data. */
interface ChartQuery<T> {
  data: T | undefined;
  isError: boolean;
  isPending: boolean;
}

const ChartSkeleton = ({ label }: { label: string }) => (
  <div aria-busy="true" className="h-full">
    <output className="sr-only">{label}</output>
    <Skeleton aria-hidden="true" className="h-full" />
  </div>
);

// A query that failed must not borrow an empty state: "nothing moved this
// period" and "you have no plan" are claims the response never made.
const ChartUnavailable = () => (
  <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
    {m.budget_chart_unavailable()}
  </p>
);

const PrimaryChartBody = ({
  breakdown,
  cashFlow,
  onSelect,
  view,
}: {
  breakdown: ChartQuery<BreakdownData>;
  cashFlow: ChartQuery<CashFlowData>;
  onSelect: (selection: CategorySelection | null) => void;
  view: PrimaryView;
}) => {
  if (view === "flow") {
    if (cashFlow.isPending) {
      return <ChartSkeleton label={m.budget_cash_flow_loading()} />;
    }
    // keepPreviousData holds the last period's figures, so a failed refetch
    // would draw them under the new period's title.
    if (cashFlow.isError || !cashFlow.data) {
      return <ChartUnavailable />;
    }
    return <CashFlowChart {...cashFlow.data} onSelect={onSelect} />;
  }
  if (breakdown.isPending) {
    return <ChartSkeleton label={m.budget_breakdown_loading()} />;
  }
  if (breakdown.isError || !breakdown.data) {
    return <ChartUnavailable />;
  }
  return <SpendingBreakdownChart data={breakdown.data} onSelect={onSelect} />;
};

const CompanionChartBody = ({
  activeGroups,
  fixedVsVariable,
  onSelect,
  planned,
  view,
}: {
  activeGroups: CategoryGroup[];
  fixedVsVariable: ChartQuery<FixedData>;
  onSelect: (selection: CategorySelection) => void;
  planned: ChartQuery<PlannedData>;
  view: CompanionView;
}) => {
  if (view === "fixed") {
    if (fixedVsVariable.isPending) {
      return <ChartSkeleton label={m.budget_fixed_variable_loading()} />;
    }
    if (fixedVsVariable.isError || !fixedVsVariable.data) {
      return <ChartUnavailable />;
    }
    return <FixedVsVariableChart {...fixedVsVariable.data} />;
  }
  if (planned.isPending) {
    return <ChartSkeleton label={m.budget_planned_loading()} />;
  }
  if (planned.isError || !planned.data) {
    return <ChartUnavailable />;
  }
  return (
    <BudgetVsActualChart
      activeGroups={activeGroups}
      {...planned.data}
      onSelect={onSelect}
    />
  );
};

interface BudgetChartsProps {
  activeGroups: CategoryGroup[];
  aggregation: AggregationMode;
  breakdown: ChartQuery<BreakdownData>;
  cashFlow: ChartQuery<CashFlowData>;
  companion: CompanionView;
  fixedVsVariable: ChartQuery<FixedData>;
  onCompanionChange: (view: CompanionView) => void;
  onSelect: (selection: CategorySelection | null) => void;
  onViewChange: (view: PrimaryView) => void;
  planned: ChartQuery<PlannedData>;
  view: PrimaryView;
}

/**
 * Two chart positions, never more: a new chart becomes another view of one of
 * them, so the page above the transaction list keeps its shape as the feature
 * grows. Both selections live in the URL — a period change must not reset the
 * view the reader chose, and a shared link must reproduce it.
 */
export const BudgetCharts = ({
  activeGroups,
  aggregation,
  breakdown,
  cashFlow,
  companion,
  fixedVsVariable,
  onCompanionChange,
  onSelect,
  onViewChange,
  planned,
  view,
}: BudgetChartsProps) => {
  const companionTitle =
    companion === "fixed"
      ? m.budget_view_fixed_variable()
      : m.budget_view_planned();

  return (
    <div className="grid grid-cols-1 gap-4 @min-[52rem]/budget:grid-cols-[2fr_1fr]">
      <div className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle className="truncate">
              {view === "flow"
                ? m.budget_cash_flow_title()
                : m.budget_breakdown_title()}
              {aggregation !== "total" && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {aggregationLabel(aggregation)}
                </span>
              )}
            </CardTitle>
            <CardAction>
              <ToggleGroup
                aria-label={m.budget_view_switch_label()}
                onValueChange={([next]) => {
                  if (next === "flow" || next === "categories") {
                    onViewChange(next);
                  }
                }}
                size="sm"
                spacing={0}
                value={[view]}
                variant="outline"
              >
                <ToggleGroupItem className={PRESS} value="flow">
                  {m.budget_view_flow()}
                </ToggleGroupItem>
                <ToggleGroupItem className={PRESS} value="categories">
                  {m.budget_view_categories()}
                </ToggleGroupItem>
              </ToggleGroup>
            </CardAction>
          </CardHeader>
          <CardContent className={CHART_BODY}>
            <PrimaryChartBody
              breakdown={breakdown}
              cashFlow={cashFlow}
              onSelect={onSelect}
              view={view}
            />
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        <Card>
          <CardHeader>
            {/* The trigger already names the view; a title beside it would
                print the same words twice in a 293px header. */}
            <Select
              onValueChange={(next) =>
                onCompanionChange(next === "planned" ? "planned" : "fixed")
              }
              value={companion}
            >
              <SelectTrigger
                aria-label={m.budget_companion_switch_label()}
                className={PRESS}
                size="sm"
              >
                <SelectValue>{() => companionTitle}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="fixed">
                    {m.budget_view_fixed_variable()}
                  </SelectItem>
                  <SelectItem value="planned">
                    {m.budget_view_planned()}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className={CHART_BODY}>
            <CompanionChartBody
              activeGroups={activeGroups}
              fixedVsVariable={fixedVsVariable}
              onSelect={onSelect}
              planned={planned}
              view={companion}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

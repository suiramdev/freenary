import { CATEGORY_GROUP_COLORS } from "@freenary/api/lib/taxonomy";
import type { CategoryGroup } from "@freenary/api/lib/taxonomy";
import { Button } from "@freenary/ui/components/button";
import { cn } from "@freenary/ui/lib/utils";
import { Link } from "@tanstack/react-router";

import type { CategorySelection } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { categoryGroupLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface PlannedGroup {
  actual: number;
  group: CategoryGroup;
  planned: number;
}

interface BudgetVsActualChartProps {
  activeGroups: CategoryGroup[];
  groups: PlannedGroup[];
  hasPlan: boolean;
  onSelect: (selection: CategorySelection) => void;
}

const PlanTrack = ({
  actualColor,
  actualShare,
  plannedShare,
}: {
  actualColor: string;
  actualShare: number;
  plannedShare: number;
}) => (
  <span className="bg-muted relative block h-2 w-full overflow-hidden rounded-full">
    <span
      className="bg-muted-foreground/25 absolute inset-y-0 start-0 rounded-full"
      style={{ width: `${plannedShare * 100}%` }}
    />
    <span
      className="absolute inset-y-0 start-0 rounded-full"
      style={{ backgroundColor: actualColor, width: `${actualShare * 100}%` }}
    />
  </span>
);

const PlannedRow = ({
  entry,
  isSelected,
  onSelect,
  scale,
}: {
  entry: PlannedGroup;
  isSelected: boolean;
  onSelect: (selection: CategorySelection) => void;
  scale: number;
}) => {
  const hasPlanForGroup = entry.planned > 0;
  const isOverPlan = hasPlanForGroup && entry.actual > entry.planned;

  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "hover:bg-muted/60 flex w-full cursor-pointer flex-col gap-1.5 rounded-md p-1 text-start transition-transform duration-150 ease-out active:scale-[0.96]",
        isSelected ? "text-foreground" : "text-muted-foreground"
      )}
      onClick={() => onSelect({ group: entry.group, kind: "group" })}
      type="button"
    >
      <span className="flex items-baseline gap-2 text-xs">
        <span className="truncate">{categoryGroupLabel(entry.group)}</span>
        <span
          className={cn(
            "shrink-0 text-[10px]",
            isOverPlan ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {isOverPlan &&
            m.budget_planned_over({
              amount: formatCurrency(entry.actual - entry.planned),
            })}
          {hasPlanForGroup &&
            !isOverPlan &&
            m.budget_planned_under({
              amount: formatCurrency(entry.planned - entry.actual),
            })}
          {!hasPlanForGroup && m.budget_planned_unplanned()}
        </span>
        <span className="ms-auto shrink-0 font-mono text-[11px] tabular-nums">
          <span className={isOverPlan ? "text-destructive" : "text-foreground"}>
            {formatCurrency(entry.actual)}
          </span>
          {hasPlanForGroup && (
            <span className="text-muted-foreground">
              {" / "}
              {formatCurrency(entry.planned)}
            </span>
          )}
        </span>
      </span>
      <PlanTrack
        actualColor={
          isOverPlan
            ? "var(--destructive)"
            : CHART_COLOR_VARS[CATEGORY_GROUP_COLORS[entry.group]]
        }
        actualShare={entry.actual / scale}
        plannedShare={entry.planned / scale}
      />
    </button>
  );
};

export const BudgetVsActualChart = ({
  activeGroups,
  groups,
  hasPlan,
  onSelect,
}: BudgetVsActualChartProps) => {
  if (!hasPlan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted-foreground text-xs">
          {m.budget_planned_empty()}
        </p>
        <Button
          className="transition-transform duration-150 ease-out active:scale-[0.96]"
          render={<Link to="/settings" />}
          variant="outline"
        >
          {m.budget_planned_empty_cta()}
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_breakdown_empty()}
      </p>
    );
  }

  const sharedScale = Math.max(
    ...groups.map((entry) => Math.max(entry.planned, entry.actual))
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="text-muted-foreground flex justify-end gap-1 font-mono text-[10px]">
        <span>{m.budget_planned_column_actual()}</span>
        <span aria-hidden="true">/</span>
        <span>{m.budget_planned_column_planned()}</span>
      </div>
      <ul
        aria-label={m.budget_planned_chart_label()}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
      >
        {groups.map((entry) => (
          <li key={entry.group}>
            <PlannedRow
              entry={entry}
              isSelected={activeGroups.includes(entry.group)}
              onSelect={onSelect}
              scale={sharedScale}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

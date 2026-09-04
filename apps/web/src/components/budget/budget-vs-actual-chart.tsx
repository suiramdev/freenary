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

/** One row: what a group was allowed and what it actually cost. */
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
  // Spending in a group the user never planned is unplanned, not an overrun of
  // a plan of zero: there is no plan to measure it against.
  const isPlanned = entry.planned > 0;
  const isOver = isPlanned && entry.actual > entry.planned;

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
            isOver ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {isOver &&
            m.budget_planned_over({
              amount: formatCurrency(entry.actual - entry.planned),
            })}
          {isPlanned &&
            !isOver &&
            m.budget_planned_under({
              amount: formatCurrency(entry.planned - entry.actual),
            })}
          {!isPlanned && m.budget_planned_unplanned()}
        </span>
        <span className="ms-auto shrink-0 font-mono text-[11px] tabular-nums">
          <span className={isOver ? "text-destructive" : "text-foreground"}>
            {formatCurrency(entry.actual)}
          </span>
          {/* An unplanned group has nothing to compare against: no "/ €0.00". */}
          {isPlanned && (
            <span className="text-muted-foreground">
              {" / "}
              {formatCurrency(entry.planned)}
            </span>
          )}
        </span>
      </span>
      <span className="bg-muted relative block h-2 w-full overflow-hidden rounded-full">
        {/* Planned is the recessed track; actual is drawn over it. */}
        <span
          className="bg-muted-foreground/25 absolute inset-y-0 start-0 rounded-full"
          style={{ width: `${(entry.planned / scale) * 100}%` }}
        />
        <span
          className="absolute inset-y-0 start-0 rounded-full"
          style={{
            backgroundColor: isOver
              ? "var(--destructive)"
              : CHART_COLOR_VARS[CATEGORY_GROUP_COLORS[entry.group]],
            width: `${(entry.actual / scale) * 100}%`,
          }}
        />
      </span>
    </button>
  );
};

/**
 * Planned against actual, group by group. Rows share one scale so their bars
 * compare across groups rather than only against their own plan.
 */
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

  const scale = Math.max(
    ...groups.map((entry) => Math.max(entry.planned, entry.actual))
  );

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Names the trailing pair so "1 234 € / 1 000 €" is readable without the tooltip. */}
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
              scale={scale}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

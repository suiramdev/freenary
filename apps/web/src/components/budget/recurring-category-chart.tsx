import {
  CATEGORY_GROUP_COLORS,
  CATEGORY_GROUP_OF,
} from "@freenary/api/lib/taxonomy";

import { formatCurrency } from "@/lib/budget/format-currency";
import type { RecurringCategoryRow } from "@/lib/budget/recurring";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface RecurringCategoryChartProps {
  currency: string;
  rows: RecurringCategoryRow[];
}

/**
 * Where the recurring cost sits, a month at a time. Rows share one scale so
 * they compare against each other. Read-only: a category here filters nothing,
 * so no row may look pressable.
 */
export const RecurringCategoryChart = ({
  currency,
  rows,
}: RecurringCategoryChartProps) => {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_recurring_categories_empty()}
      </p>
    );
  }

  const scale = Math.max(...rows.map((row) => row.monthlyMinor));

  return (
    <ul
      aria-label={m.budget_recurring_categories_chart_label()}
      className="flex h-full flex-col gap-2 overflow-y-auto"
    >
      {rows.map((row) => (
        <li className="flex flex-col gap-1.5 p-1" key={row.category}>
          <span className="flex items-baseline gap-2 text-xs">
            <span className="text-muted-foreground truncate">
              {categoryLabel(row.category)}
            </span>
            <span className="ms-auto shrink-0 font-mono text-[11px] tabular-nums">
              {formatCurrency(row.monthlyMinor, currency)}
            </span>
          </span>
          <span className="bg-muted relative block h-2 w-full overflow-hidden rounded-full">
            <span
              className="absolute inset-y-0 start-0 rounded-full"
              style={{
                backgroundColor:
                  CHART_COLOR_VARS[
                    CATEGORY_GROUP_COLORS[CATEGORY_GROUP_OF[row.category]]
                  ],
                width: `${(row.monthlyMinor / scale) * 100}%`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
};

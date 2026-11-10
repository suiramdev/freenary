import { categoryChartColor, categoryLabel } from "@/entities/category";
import { m } from "@/paraglide/messages.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import type { RecurringCategoryRow } from "../model/recurring";
import { RankedBarChart } from "./ranked-bar-chart";
import type { RankedBar } from "./ranked-bar-chart";

interface RecurringCategoryChartProps {
  currency: string;
  rows: RecurringCategoryRow[];
}

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

  const bars = rows.map((row): RankedBar => {
    const color = categoryChartColor(row.category);
    const monthly = formatCurrency(row.monthlyMinor, currency);

    return {
      color,
      label: categoryLabel(row.category),
      tooltipRows: [
        {
          color,
          label: m.budget_recurring_column_monthly(),
          value: monthly,
        },
      ],
      value: row.monthlyMinor,
      valueLabel: monthly,
    };
  });

  return (
    <RankedBarChart
      bars={bars}
      label={m.budget_recurring_categories_chart_label()}
    />
  );
};

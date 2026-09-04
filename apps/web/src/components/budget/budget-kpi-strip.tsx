import { Skeleton } from "@freenary/ui/components/skeleton";
import { cn } from "@freenary/ui/lib/utils";

import { formatCurrency } from "@/lib/budget/format-currency";
import type { AggregationMode } from "@/lib/budget/period";
import { m } from "@/paraglide/messages.js";

interface SummaryLabels {
  expenses: () => string;
  income: () => string;
  net: () => string;
}

// Message *functions*, never their results: evaluating at module scope would
// freeze the first request's locale for the whole SSR process.
const SUMMARY_LABELS = {
  average: {
    expenses: m.budget_summary_expenses_average,
    income: m.budget_summary_income_average,
    net: m.budget_summary_net_average,
  },
  median: {
    expenses: m.budget_summary_expenses_median,
    income: m.budget_summary_income_median,
    net: m.budget_summary_net_median,
  },
  total: {
    expenses: m.budget_summary_expenses_total,
    income: m.budget_summary_income_total,
    net: m.budget_summary_net_total,
  },
} satisfies Record<AggregationMode, SummaryLabels>;

const STRIP_LAYOUT = "grid grid-cols-1 gap-4 @md/budget:grid-cols-3";

/** Matches a cell's own height so the strip does not resize when data lands. */
const CELL_HEIGHT = "h-14";

/** A query that failed has no figure; a formatted zero would invent one. */
const KpiCell = ({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: string;
  value: number | null;
}) => (
  <div className={cn("flex flex-col gap-1", CELL_HEIGHT)}>
    {value === null ? (
      <span className="text-muted-foreground text-2xl font-semibold">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{m.budget_summary_unavailable()}</span>
      </span>
    ) : (
      <span className={cn("text-2xl font-semibold tabular-nums", tone)}>
        {formatCurrency(value)}
      </span>
    )}
    <span className="text-muted-foreground text-sm">{label}</span>
  </div>
);

interface BudgetKpiStripProps {
  aggregation: AggregationMode;
  isError: boolean;
  isPending: boolean;
  totalExpenses: number;
  totalIncome: number;
}

/** The period's three headline figures, above every chart that details them. */
export const BudgetKpiStrip = ({
  aggregation,
  isError,
  isPending,
  totalExpenses,
  totalIncome,
}: BudgetKpiStripProps) => {
  const labels = SUMMARY_LABELS[aggregation];

  if (isPending) {
    return (
      <div aria-busy="true" className={STRIP_LAYOUT}>
        <output className="sr-only">{m.budget_summary_loading()}</output>
        <Skeleton aria-hidden="true" className={CELL_HEIGHT} />
        <Skeleton aria-hidden="true" className={CELL_HEIGHT} />
        <Skeleton aria-hidden="true" className={CELL_HEIGHT} />
      </div>
    );
  }

  const net = totalIncome - totalExpenses;

  return (
    <div className={STRIP_LAYOUT}>
      <KpiCell label={labels.income()} value={isError ? null : totalIncome} />
      <KpiCell
        label={labels.expenses()}
        value={isError ? null : totalExpenses}
      />
      <KpiCell
        label={labels.net()}
        tone={net >= 0 ? "text-success" : "text-destructive"}
        value={isError ? null : net}
      />
    </div>
  );
};

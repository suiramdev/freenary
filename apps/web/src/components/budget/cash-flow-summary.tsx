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

interface CashFlowSummaryProps {
  aggregation: AggregationMode;
  totalExpenses: number;
  totalIncome: number;
}

export const CashFlowSummary = ({
  aggregation,
  totalExpenses,
  totalIncome,
}: CashFlowSummaryProps) => {
  const net = totalIncome - totalExpenses;
  const labels = SUMMARY_LABELS[aggregation];

  return (
    <div className="mt-2 flex justify-between font-mono text-[11px]">
      <span className="text-muted-foreground">
        {labels.income()}{" "}
        <span className="text-foreground">{formatCurrency(totalIncome)}</span>
      </span>
      <span className="text-muted-foreground">
        {labels.expenses()}{" "}
        <span className="text-foreground">{formatCurrency(totalExpenses)}</span>
      </span>
      <span className="text-muted-foreground">
        {labels.net()}{" "}
        <span className={net >= 0 ? "text-success" : "text-destructive"}>
          {formatCurrency(net)}
        </span>
      </span>
    </div>
  );
};

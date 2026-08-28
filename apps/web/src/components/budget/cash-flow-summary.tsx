import type { AggregationMode } from "@/lib/budget/period";
import { formatCurrency } from "@/lib/budget/format-currency";

const SUMMARY_PREFIX: Record<AggregationMode, string> = {
  total: "",
  average: "Avg. ",
  median: "Med. ",
};

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

  return (
    <div className="mt-2 flex justify-between font-mono text-[11px]">
      <span className="text-muted-foreground">
        {SUMMARY_PREFIX[aggregation]}Income:{" "}
        <span className="text-foreground">{formatCurrency(totalIncome)}</span>
      </span>
      <span className="text-muted-foreground">
        {SUMMARY_PREFIX[aggregation]}Expenses:{" "}
        <span className="text-foreground">{formatCurrency(totalExpenses)}</span>
      </span>
      <span className="text-muted-foreground">
        {SUMMARY_PREFIX[aggregation]}Net:{" "}
        <span className={net >= 0 ? "text-success" : "text-destructive"}>
          {formatCurrency(net)}
        </span>
      </span>
    </div>
  );
};

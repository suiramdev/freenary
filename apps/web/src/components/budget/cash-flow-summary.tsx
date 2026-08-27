import { formatCurrency } from "@/lib/budget/format-currency";

interface CashFlowSummaryProps {
  totalExpenses: number;
  totalIncome: number;
}

export const CashFlowSummary = ({
  totalExpenses,
  totalIncome,
}: CashFlowSummaryProps) => {
  const net = totalIncome - totalExpenses;

  return (
    <div className="mt-2 flex justify-between font-mono text-[11px]">
      <span className="text-muted-foreground">
        Income:{" "}
        <span className="text-foreground">{formatCurrency(totalIncome)}</span>
      </span>
      <span className="text-muted-foreground">
        Expenses:{" "}
        <span className="text-foreground">{formatCurrency(totalExpenses)}</span>
      </span>
      <span className="text-muted-foreground">
        Net:{" "}
        <span className={net >= 0 ? "text-success" : "text-destructive"}>
          {formatCurrency(net)}
        </span>
      </span>
    </div>
  );
};

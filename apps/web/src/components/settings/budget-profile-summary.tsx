import { formatCurrency } from "@/lib/budget/format-currency";

interface BudgetProfileSummaryProps {
  totalAllocated: number;
  totalRevenue: number;
}

export const BudgetProfileSummary = ({
  totalAllocated,
  totalRevenue,
}: BudgetProfileSummaryProps) => {
  const remaining = totalRevenue - totalAllocated;

  return (
    <div className="mt-2 flex justify-between font-mono text-[11px]">
      <span className="text-muted-foreground">
        Revenues:{" "}
        <span className="text-foreground">{formatCurrency(totalRevenue)}</span>
      </span>
      <span className="text-muted-foreground">
        Allocated:{" "}
        <span className="text-foreground">
          {formatCurrency(totalAllocated)}
        </span>
      </span>
      <span className="text-muted-foreground">
        {remaining >= 0 ? "Unallocated: " : "Over-allocated: "}
        <span className={remaining >= 0 ? "text-success" : "text-destructive"}>
          {formatCurrency(Math.abs(remaining))}
        </span>
      </span>
    </div>
  );
};

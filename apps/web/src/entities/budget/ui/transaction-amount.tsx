import { cn } from "@freenary/ui/lib/utils";

import { formatCurrency } from "@/shared/lib/format-currency";

export const TransactionAmount = ({
  amount,
  className,
  currency,
}: {
  amount: number;
  className?: string;
  currency: string;
}) => {
  const incoming = amount > 0;

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        incoming && "text-success",
        className
      )}
    >
      {incoming ? "+" : "−"}
      {formatCurrency(Math.abs(amount), currency)}
    </span>
  );
};

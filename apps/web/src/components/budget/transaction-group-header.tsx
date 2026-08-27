import { formatCurrency } from "@/lib/budget/format-currency";

export const TransactionGroupHeader = ({
  label,
  total,
  currency,
  index,
  offset,
  measureRef,
}: {
  label: string;
  total: number;
  currency: string;
  index: number;
  offset: number;
  measureRef: (node: Element | null) => void;
}) => (
  <div
    data-index={index}
    ref={measureRef}
    className="text-muted-foreground absolute inset-x-0 flex items-center justify-between px-1 pt-4 pb-1.5 text-[11px] font-medium"
    style={{ transform: `translateY(${offset}px)` }}
  >
    <span>{label}</span>
    <span className="tabular-nums">{formatCurrency(total, currency)}</span>
  </div>
);

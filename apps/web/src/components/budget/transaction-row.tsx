import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import { cn } from "@freenary/ui/lib/utils";

import { CategoryIcon } from "@/components/budget/category-icon";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { Transaction } from "@/lib/budget/transaction";

export const TransactionRow = ({
  transaction,
  isIncoming,
  index,
  offset,
  measureRef,
  onClick,
}: {
  transaction: Transaction;
  isIncoming: boolean;
  index: number;
  offset: number;
  measureRef: (node: Element | null) => void;
  onClick: () => void;
}) => (
  <button
    type="button"
    data-index={index}
    ref={measureRef}
    className="border-border hover:bg-muted/50 absolute inset-x-0 flex cursor-pointer items-center gap-3 border-b px-1 py-3 text-left transition-colors duration-150"
    style={{ transform: `translateY(${offset}px)` }}
    onClick={onClick}
  >
    <CategoryIcon
      {...predefinedCategoryAppearance(transaction.category)}
      className="size-8 [&_svg]:size-4"
    />
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-xs font-medium">
        {transaction.counterpartyName ?? transaction.description}
      </span>
      {transaction.counterpartyName && transaction.description ? (
        <span className="text-muted-foreground truncate text-[10px]">
          {transaction.description}
        </span>
      ) : null}
    </div>
    <span
      className={cn(
        "shrink-0 text-xs font-medium tabular-nums",
        isIncoming ? "text-success" : "text-destructive"
      )}
    >
      {isIncoming ? "+" : "−"}
      {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
    </span>
  </button>
);

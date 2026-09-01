import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@freenary/ui/components/item";
import { cn } from "@freenary/ui/lib/utils";

import { CategoryIcon } from "@/components/budget/category-icon";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { Transaction } from "@/lib/budget/transaction";
import { m } from "@/paraglide/messages.js";

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
}) => {
  const amount = formatCurrency(
    Math.abs(transaction.amount),
    transaction.currency
  );
  const title = transaction.counterpartyName ?? transaction.description;

  return (
    <Item
      className="hover:bg-muted/50 border-b-border absolute inset-x-0 cursor-pointer text-left"
      data-index={index}
      ref={measureRef}
      render={
        <button
          aria-label={
            isIncoming
              ? m.budget_transaction_received({ amount, title })
              : m.budget_transaction_paid({ amount, title })
          }
          type="button"
        />
      }
      size="sm"
      style={{ transform: `translateY(${offset}px)` }}
      onClick={onClick}
    >
      <ItemMedia>
        <CategoryIcon
          {...predefinedCategoryAppearance(transaction.category)}
          className="size-8 [&_svg]:size-4"
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        {/* ItemTitle's own `flex` beats its `line-clamp-1`, so truncation has
            to be re-stated on a block box. */}
        <ItemTitle className="block w-full truncate">{title}</ItemTitle>
        {transaction.counterpartyName && transaction.description ? (
          <ItemDescription className="block truncate">
            {transaction.description}
          </ItemDescription>
        ) : null}
      </ItemContent>
      <ItemContent
        className={cn(
          "font-medium tabular-nums",
          isIncoming ? "text-success" : "text-destructive"
        )}
      >
        {isIncoming ? "+" : "−"}
        {amount}
      </ItemContent>
    </Item>
  );
};

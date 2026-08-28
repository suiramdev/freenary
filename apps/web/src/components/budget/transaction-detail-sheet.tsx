import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import { Separator } from "@freenary/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@freenary/ui/components/sheet";
import { cn } from "@freenary/ui/lib/utils";
import { CalendarIcon, TagIcon } from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { TransactionCategoryPicker } from "@/components/budget/transaction-category-picker";
import { TransactionDetailRow } from "@/components/budget/transaction-detail-row";
import { useTransactionCategory } from "@/hooks/budget/use-transaction-category";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { Transaction } from "@/lib/budget/transaction";

export const TransactionDetailSheet = ({
  onOpenChange,
  open,
  transaction,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  transaction: Transaction | null;
}) => {
  const updateCategory = useTransactionCategory(transaction);

  if (!transaction) {
    return null;
  }

  const isIncoming = transaction.amount > 0;
  const isOverridden = transaction.category !== transaction.derivedCategory;
  const displayDate = new Date(transaction.date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    weekday: "short",
    year: "numeric",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Transaction details</SheetTitle>
          <SheetDescription className="sr-only">
            View and edit transaction details
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6">
          <div className="flex flex-col items-center gap-3 pt-2">
            <CategoryIcon
              {...predefinedCategoryAppearance(transaction.category)}
              className="size-12 [&_svg]:size-6"
            />
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  isIncoming ? "text-success" : "text-foreground"
                )}
              >
                {isIncoming ? "+" : "−"}
                {formatCurrency(
                  Math.abs(transaction.amount),
                  transaction.currency
                )}
              </span>
              <span className="text-muted-foreground text-sm">
                {transaction.counterpartyName ?? transaction.description}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <TransactionDetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Date"
            >
              <span className="text-sm">{displayDate}</span>
            </TransactionDetailRow>

            {transaction.counterpartyName && transaction.description ? (
              <TransactionDetailRow
                icon={<TagIcon className="size-4" />}
                label="Description"
              >
                <span className="text-sm">{transaction.description}</span>
              </TransactionDetailRow>
            ) : null}

            <TransactionDetailRow
              label="Category"
              media={
                <CategoryIcon
                  {...predefinedCategoryAppearance(transaction.category)}
                  className="size-8 [&_svg]:size-4"
                />
              }
            >
              <TransactionCategoryPicker
                category={transaction.category}
                isOverridden={isOverridden}
                onSelect={(category) => updateCategory.mutate(category)}
                onReset={() => updateCategory.mutate(null)}
              />
            </TransactionDetailRow>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

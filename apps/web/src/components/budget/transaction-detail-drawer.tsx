import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@freenary/ui/components/drawer";
import { Separator } from "@freenary/ui/components/separator";
import { cn } from "@freenary/ui/lib/utils";
import { CalendarIcon, TagIcon, XIcon } from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { TransactionCategoryPicker } from "@/components/budget/transaction-category-picker";
import { TransactionDetailRow } from "@/components/budget/transaction-detail-row";
import { useTransactionCategory } from "@/hooks/budget/use-transaction-category";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { Transaction } from "@/lib/budget/transaction";

export const TransactionDetailDrawer = ({
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
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="w-full sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Transaction details</DrawerTitle>
          <DrawerDescription className="sr-only">
            View and edit transaction details
          </DrawerDescription>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 pt-0">
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

          <ul className="flex flex-col gap-2.5">
            <TransactionDetailRow icon={<CalendarIcon />} label="Date">
              <span className="text-sm">{displayDate}</span>
            </TransactionDetailRow>

            {transaction.counterpartyName && transaction.description ? (
              <TransactionDetailRow icon={<TagIcon />} label="Description">
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
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

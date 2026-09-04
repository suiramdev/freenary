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
import { RiCalendarLine, RiCloseLine, RiPriceTag3Line } from "@remixicon/react";
import { useEffect, useState } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { TransactionCategoryPicker } from "@/components/budget/transaction-category-picker";
import { TransactionDetailRow } from "@/components/budget/transaction-detail-row";
import { useTransactionCategory } from "@/hooks/budget/use-transaction-category";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { Transaction } from "@/lib/budget/transaction";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/** Split out so the drawer root can stay mounted with no transaction selected. */
const TransactionDetails = ({ transaction }: { transaction: Transaction }) => {
  const updateCategory = useTransactionCategory(transaction);

  const isIncoming = transaction.amount > 0;
  const isOverridden = transaction.category !== transaction.derivedCategory;
  const displayDate = new Date(transaction.date).toLocaleDateString(
    getLocale(),
    {
      day: "numeric",
      month: "long",
      weekday: "short",
      year: "numeric",
    }
  );

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{m.budget_detail_title()}</DrawerTitle>
        <DrawerDescription className="sr-only">
          {m.budget_detail_sr_description()}
        </DrawerDescription>
        <DrawerClose
          render={<Button variant="ghost" className="absolute end-4 top-4" />}
        >
          <RiCloseLine />
          <span className="sr-only">{m.budget_detail_close()}</span>
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
          <TransactionDetailRow
            icon={<RiCalendarLine />}
            label={m.budget_detail_date_label()}
          >
            <span className="text-sm">{displayDate}</span>
          </TransactionDetailRow>

          {transaction.counterpartyName && transaction.description ? (
            <TransactionDetailRow
              icon={<RiPriceTag3Line />}
              label={m.budget_detail_description_label()}
            >
              <span className="text-sm">{transaction.description}</span>
            </TransactionDetailRow>
          ) : null}

          <TransactionDetailRow
            label={m.budget_detail_category_label()}
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
    </>
  );
};

export const TransactionDetailDrawer = ({
  onOpenChange,
  open,
  transaction,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  transaction: Transaction | null;
}) => {
  // Base UI only plays the enter transition when `open` flips on an already
  // mounted root, so the drawer stays rendered; the last transaction is kept
  // so the closing animation still has something to show.
  const [shown, setShown] = useState(transaction);
  if (transaction !== null && transaction !== shown) {
    setShown(transaction);
  }

  // A recategorised transaction can drop out of a filtered refetch; without
  // this the drawer would sit open on the copy it was opened with.
  useEffect(() => {
    if (open && transaction === null) {
      onOpenChange(false);
    }
  }, [onOpenChange, open, transaction]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="w-full sm:max-w-md">
        {shown === null ? null : <TransactionDetails transaction={shown} />}
      </DrawerContent>
    </Drawer>
  );
};

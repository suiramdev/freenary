import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { Separator } from "@freenary/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@freenary/ui/components/sheet";
import {
  ArrowCounterClockwiseIcon,
  CalendarIcon,
  CaretUpDownIcon,
  SpinnerGapIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

import { CategoryIcon } from "./category-icon";
import type { Transaction } from "./transaction-list";

interface TransactionDetailSheetProps {
  formatAmount: (amount: number, currency: string) => string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  transaction: Transaction | null;
}

export const TransactionDetailSheet = ({
  formatAmount,
  onOpenChange,
  open,
  transaction,
}: TransactionDetailSheetProps) => {
  const queryClient = useQueryClient();

  const updateCategory = useMutation({
    mutationFn: (category: SpendingCategory | null) =>
      client.budget.updateTransactionCategory({
        category,
        transactionId: transaction?.id ?? "",
      }),
    onSuccess: () => {
      // Invalidate all budget queries so transaction list + charts refetch.
      // oRPC keys are [["budget", ...], ...]; manual key is ["budget", ...].
      queryClient.invalidateQueries({
        predicate: ({ queryKey: [key] }) =>
          key === "budget" || (Array.isArray(key) && key[0] === "budget"),
      });
    },
  });

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
          {/* Amount + counterparty header */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <CategoryIcon
              category={transaction.category}
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
                {formatAmount(
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

          {/* Detail rows */}
          <div className="flex flex-col gap-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground flex size-8 items-center justify-center">
                <CalendarIcon className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[11px]">Date</span>
                <span className="text-sm">{displayDate}</span>
              </div>
            </div>

            {/* Description (when counterpartyName exists and differs) */}
            {transaction.counterpartyName && transaction.description ? (
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground flex size-8 items-center justify-center">
                  <TagIcon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[11px]">
                    Description
                  </span>
                  <span className="text-sm">{transaction.description}</span>
                </div>
              </div>
            ) : null}

            {/* Category — editable */}
            <div className="flex items-center gap-3">
              <CategoryIcon
                category={transaction.category}
                className="size-8 [&_svg]:size-4"
              />
              <div className="flex flex-1 flex-col">
                <span className="text-muted-foreground text-[11px]">
                  Category
                </span>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto justify-start gap-1.5 px-0 py-0.5 font-normal"
                          disabled={updateCategory.isPending}
                        />
                      }
                    >
                      {updateCategory.isPending ? (
                        <SpinnerGapIcon className="size-3 animate-spin" />
                      ) : null}
                      <span className="text-sm">
                        {CATEGORY_LABELS[transaction.category]}
                      </span>
                      <CaretUpDownIcon className="text-muted-foreground size-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="max-h-72 overflow-y-auto"
                    >
                      <DropdownMenuRadioGroup
                        value={transaction.category}
                        onValueChange={(v) =>
                          // SAFETY: RadioGroup values are constrained to SPENDING_CATEGORIES entries
                          updateCategory.mutate(v as SpendingCategory)
                        }
                      >
                        {SPENDING_CATEGORIES.map((cat) => (
                          <DropdownMenuRadioItem key={cat} value={cat}>
                            <CategoryIcon
                              category={cat}
                              className="size-5 [&_svg]:size-3"
                            />
                            {CATEGORY_LABELS[cat]}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {isOverridden ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateCategory.mutate(null)}
                      disabled={updateCategory.isPending}
                      className="text-muted-foreground"
                    >
                      <ArrowCounterClockwiseIcon className="size-3" />
                      <span className="sr-only">
                        Reset to auto-detected category
                      </span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

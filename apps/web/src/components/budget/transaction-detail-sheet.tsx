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
  TagIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";

import { CategoryIcon } from "./category-icon";
import type { Transaction } from "./transaction-list";

const isBudgetQuery = ({ queryKey: [key] }: { queryKey: readonly unknown[] }) =>
  key === "budget" || (Array.isArray(key) && key[0] === "budget");

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

  const patchCategory = (txId: string, category: SpendingCategory) => {
    queryClient.setQueriesData<{
      pageParams: unknown[];
      pages: { transactions: Transaction[] }[];
    }>(
      {
        predicate: ({ queryKey }) =>
          queryKey[0] === "budget" && queryKey[1] === "getTransactions",
      },
      (old) => {
        if (!old?.pages) {
          return old;
        }
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            transactions: page.transactions.map((tx) =>
              tx.id === txId ? { ...tx, category } : tx
            ),
          })),
        };
      }
    );
  };

  const updateCategory = useMutation<
    unknown,
    Error,
    SpendingCategory | null,
    { previousCategory: SpendingCategory; txId: string }
  >({
    mutationFn: (category: SpendingCategory | null) =>
      client.budget.updateTransactionCategory({
        category,
        transactionId: transaction?.id ?? "",
      }),
    onError: (_err, _vars, context) => {
      if (context) {
        patchCategory(context.txId, context.previousCategory);
      }
      toast.error("Failed to update category");
    },
    onMutate: async (newCategory) => {
      // The dropdown is only rendered when transaction is non-null
      const tx = transaction;
      if (!tx) {
        throw new Error("Missing transaction");
      }

      await queryClient.cancelQueries({ predicate: isBudgetQuery });

      const previousCategory = tx.category;
      patchCategory(tx.id, newCategory ?? tx.derivedCategory);

      return { previousCategory, txId: tx.id };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ predicate: isBudgetQuery });
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
                        />
                      }
                    >
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

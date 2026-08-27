import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Transaction } from "@/lib/budget/transaction";
import { client } from "@/utils/orpc";

const isBudgetQuery = ({ queryKey: [key] }: { queryKey: readonly unknown[] }) =>
  key === "budget" || (Array.isArray(key) && key[0] === "budget");

/** Overrides a transaction's category, patching every cached page optimistically. */
export const useTransactionCategory = (transaction: Transaction | null) => {
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

  return useMutation<
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
};

import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Transaction } from "@/lib/budget/transaction";
import { m } from "@/paraglide/messages.js";
import { client } from "@/utils/orpc";

const isBudgetQuery = ({ queryKey: [key] }: { queryKey: readonly unknown[] }) =>
  key === "budget" || (Array.isArray(key) && key[0] === "budget");

/** Overrides a transaction's category, patching every cached page optimistically. */
export const useTransactionCategory = (transaction: Transaction) => {
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
        transactionId: transaction.id,
      }),
    onError: (_err, _vars, context) => {
      if (context) {
        patchCategory(context.txId, context.previousCategory);
      }
      toast.error(m.budget_category_update_error());
    },
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ predicate: isBudgetQuery });

      const previousCategory = transaction.category;
      patchCategory(transaction.id, newCategory ?? transaction.derivedCategory);

      return { previousCategory, txId: transaction.id };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ predicate: isBudgetQuery });
    },
  });
};

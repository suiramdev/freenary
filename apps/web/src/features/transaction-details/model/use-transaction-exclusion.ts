import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  invalidateBudgetData,
  TRANSACTIONS_QUERY_KEY,
} from "@/entities/budget";
import type { Transaction, TransactionExclusion } from "@/entities/budget";
import { m } from "@/paraglide/messages.js";
import { client } from "@/shared/api";

export type ExclusionScope = "merchant" | "transaction";

interface ExclusionChange {
  isExcluded: boolean;
  scope: ExclusionScope;
}

const EXCLUSION_OF_SCOPE = {
  merchant: "MERCHANT",
  transaction: "TRANSACTION",
} as const satisfies Record<ExclusionScope, TransactionExclusion>;

export const useTransactionExclusion = (transaction: Transaction) => {
  const queryClient = useQueryClient();

  const patchExclusion = (exclusion: TransactionExclusion | null) => {
    queryClient.setQueriesData<{
      pageParams: unknown[];
      pages: { transactions: Transaction[] }[];
    }>({ queryKey: TRANSACTIONS_QUERY_KEY }, (old) => {
      if (!old?.pages) {
        return old;
      }

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          transactions: page.transactions.map((tx) =>
            tx.id === transaction.id ? { ...tx, exclusion } : tx
          ),
        })),
      };
    });
  };

  return useMutation<
    unknown,
    Error,
    ExclusionChange,
    { previous: TransactionExclusion | null }
  >({
    mutationFn: ({ isExcluded, scope }) => {
      const input = { excluded: isExcluded, transactionId: transaction.id };

      return scope === "merchant"
        ? client.budget.excludeMerchant(input)
        : client.budget.excludeTransaction(input);
    },
    onError: (_error, _change, context) => {
      if (context) {
        patchExclusion(context.previous);
      }

      toast.error(m.budget_exclusion_update_error());
    },
    onMutate: async ({ isExcluded, scope }) => {
      await queryClient.cancelQueries({ queryKey: TRANSACTIONS_QUERY_KEY });

      const previous = transaction.exclusion ?? null;

      patchExclusion(isExcluded ? EXCLUSION_OF_SCOPE[scope] : null);

      return { previous };
    },
    onSettled: () => invalidateBudgetData(queryClient),
  });
};

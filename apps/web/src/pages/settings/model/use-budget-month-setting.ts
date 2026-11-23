import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  budgetMonthQueryOptions,
  invalidateBudgetData,
} from "@/entities/budget";
import { m } from "@/paraglide/messages.js";
import { client } from "@/shared/api";

export const useBudgetMonthSetting = () => {
  const queryClient = useQueryClient();
  const query = useQuery(budgetMonthQueryOptions());

  const saveMutation = useMutation({
    meta: { errorShownInline: true },
    mutationFn: (startDay: number) =>
      client.settings.saveBudgetMonth({ startDay }),
    onError: () => {
      toast.error(m.settings_budget_month_save_error());
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(budgetMonthQueryOptions().queryKey, saved);
      toast.success(m.settings_budget_month_saved());
      await invalidateBudgetData(queryClient);
    },
  });

  return {
    isPending: query.isPending,
    isSaving: saveMutation.isPending,
    loadError: query.isError,
    save: (startDay: number) => saveMutation.mutate(startDay),
    startDay: saveMutation.isPending
      ? saveMutation.variables
      : query.data?.startDay,
  };
};

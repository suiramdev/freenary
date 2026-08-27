import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/mcc-categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client, orpc } from "@/utils/orpc";

export const useCustomCategoryActions = () => {
  const queryClient = useQueryClient();

  const moveMutation = useMutation({
    mutationFn: (input: { direction: "down" | "up"; id: string }) =>
      client.settings.moveCustomCategory(input),
    onError: () => {
      toast.error("Failed to reorder category");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.settings.listCategories.queryOptions().queryKey,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.settings.deleteCustomCategory({ id }),
    onError: () => {
      toast.error("Failed to delete category");
    },
    onSuccess: async ({ fallbackSlug, reassignedLines }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listCategories.queryOptions().queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getBudgetProfile.queryOptions().queryKey,
        }),
      ]);

      const fallbackSlugName = SPENDING_CATEGORIES.find(
        (slug) => slug === fallbackSlug
      );
      const fallbackLabel = fallbackSlugName
        ? CATEGORY_LABELS[fallbackSlugName]
        : "Other";

      toast.success(
        reassignedLines === 0
          ? "Category deleted"
          : `Category deleted — ${reassignedLines} budget line${reassignedLines === 1 ? "" : "s"} moved to ${fallbackLabel}`
      );
    },
  });

  return {
    deleteCategory: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isMoving: moveMutation.isPending,
    moveCategory: moveMutation.mutate,
  };
};

import {
  resolveCategorySlug,
  CATEGORY_LABELS,
} from "@freenary/api/lib/taxonomy";
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

      // The server reassigns to a category, so the toast names that category.
      const fallback = resolveCategorySlug(fallbackSlug);
      const fallbackLabel = fallback ? CATEGORY_LABELS[fallback] : "Other";

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

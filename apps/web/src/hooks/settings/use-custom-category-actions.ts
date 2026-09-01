import { resolveCategorySlug } from "@freenary/api/lib/taxonomy";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";
import { client, orpc } from "@/utils/orpc";

export const useCustomCategoryActions = () => {
  const queryClient = useQueryClient();

  const moveMutation = useMutation({
    mutationFn: (input: { direction: "down" | "up"; id: string }) =>
      client.settings.moveCustomCategory(input),
    onError: () => {
      toast.error(m.settings_category_move_error());
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
      toast.error(m.settings_category_delete_error());
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
      const fallbackLabel = fallback
        ? categoryLabel(fallback)
        : m.settings_category_other();

      if (reassignedLines === 0) {
        toast.success(m.settings_category_delete_success());
      } else {
        toast.success(
          m.settings_category_delete_success_reassign({
            count: reassignedLines,
            fallback: fallbackLabel,
          })
        );
      }
    },
  });

  return {
    deleteCategory: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isMoving: moveMutation.isPending,
    moveCategory: moveMutation.mutate,
  };
};

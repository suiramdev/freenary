import {
  CATEGORY_COLOR_VALUES,
  CATEGORY_GROUPS,
  CATEGORY_ICON_NAMES,
} from "@freenary/api/lib/taxonomy";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { m } from "@/paraglide/messages.js";
import { client, orpc } from "@/utils/orpc";

const MAX_LABEL_LENGTH = 40;

const categorySchema = z.object({
  color: z.enum(CATEGORY_COLOR_VALUES),
  icon: z.enum(CATEGORY_ICON_NAMES),
  // Message thunks, resolved at parse time: evaluating them here would pin the
  // locale of whichever request loaded this module first.
  label: z
    .string()
    .trim()
    .min(1, { error: () => m.settings_error_name_required() })
    .max(MAX_LABEL_LENGTH, {
      error: () => m.settings_error_name_too_long({ max: MAX_LABEL_LENGTH }),
    }),
  // A custom category nests under a group, never under another category.
  parentSlug: z.enum(CATEGORY_GROUPS).nullable(),
});

export type CustomCategoryValues = z.infer<typeof categorySchema>;

/** The category being edited, or null when creating a new one. */
export interface EditedCustomCategory extends CustomCategoryValues {
  id: string;
}

const DEFAULT_VALUES: CustomCategoryValues = {
  color: "blue",
  icon: "DotsThreeIcon",
  label: "",
  parentSlug: null,
};

interface UseCustomCategoryFormOptions {
  edited: EditedCustomCategory | null;
  /** Receives the new category's key so the caller can select it immediately. */
  onCreated?: (key: string) => void;
  onDone: () => void;
}

export const useCustomCategoryForm = ({
  edited,
  onCreated,
  onDone,
}: UseCustomCategoryFormOptions) => {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (values: CustomCategoryValues) => {
      if (edited) {
        await client.settings.updateCustomCategory({
          ...values,
          id: edited.id,
        });
        return null;
      }
      const { key } = await client.settings.createCustomCategory(values);
      return key;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: async (key) => {
      await queryClient.invalidateQueries({
        queryKey: orpc.settings.listCategories.queryOptions().queryKey,
      });
      toast.success(
        edited
          ? m.settings_category_update_success()
          : m.settings_category_create_success()
      );
      if (key) {
        onCreated?.(key);
      }
      onDone();
    },
  });

  const form = useForm({
    defaultValues: edited
      ? {
          color: edited.color,
          icon: edited.icon,
          label: edited.label,
          parentSlug: edited.parentSlug,
        }
      : DEFAULT_VALUES,
    onSubmit: ({ value }) => {
      saveMutation.mutate(value);
    },
    validators: { onSubmit: categorySchema },
  });

  return { form, isSaving: saveMutation.isPending };
};

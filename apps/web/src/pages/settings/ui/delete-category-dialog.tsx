import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@freenary/ui/components/alert-dialog";
import { Button } from "@freenary/ui/components/button";
import { SizeProvider } from "@freenary/ui/lib/size-context";
import { RiDeleteBinLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

interface DeleteCategoryDialogProps {
  fallbackLabel: string;
  isDeleting: boolean;
  label: string;
  onConfirm: () => void;
  subcategoryCount: number;
  usageCount: number;
}

export const DeleteCategoryDialog = ({
  fallbackLabel,
  isDeleting,
  label,
  onConfirm,
  subcategoryCount,
  usageCount,
}: DeleteCategoryDialogProps) => {
  const deleteImpactDescription =
    usageCount > 0
      ? m.settings_category_delete_reassign({
          count: usageCount,
          fallback: fallbackLabel,
        })
      : m.settings_category_delete_unused({ label });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button size="icon-compact" variant="ghost" />}
      >
        <RiDeleteBinLine />
        <span className="sr-only">
          {m.settings_category_delete_action({ label })}
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <SizeProvider size="compact">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.settings_category_delete_title({ label })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteImpactDescription}
            </AlertDialogDescription>
            {subcategoryCount > 0 ? (
              <AlertDialogDescription>
                {m.settings_category_delete_subcategories({
                  count: subcategoryCount,
                })}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.settings_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive hover:text-destructive"
              loading={isDeleting}
              onClick={onConfirm}
              variant="ghost"
            >
              {m.settings_category_delete_confirm()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </SizeProvider>
      </AlertDialogContent>
    </AlertDialog>
  );
};

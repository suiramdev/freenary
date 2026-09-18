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
import { Spinner } from "@freenary/ui/components/spinner";
import { RiDeleteBinLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

interface DeleteCategoryDialogProps {
  fallbackLabel: string;
  isDeleting: boolean;
  label: string;
  onConfirm: () => void;
  usageCount: number;
}

export const DeleteCategoryDialog = ({
  fallbackLabel,
  isDeleting,
  label,
  onConfirm,
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
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        <RiDeleteBinLine />
        <span className="sr-only">
          {m.settings_category_delete_action({ label })}
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.settings_category_delete_title({ label })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteImpactDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.settings_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            variant="destructive"
            onClick={onConfirm}
          >
            {isDeleting && <Spinner data-icon="inline-start" />}
            {m.settings_category_delete_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

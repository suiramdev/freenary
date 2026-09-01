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
import { TrashIcon } from "@phosphor-icons/react";

import { m } from "@/paraglide/messages.js";

interface DeleteCategoryDialogProps {
  /** Where referencing budget lines land — the parent group's catch-all category, or "Uncategorised". */
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
  // Names the fallback category, never the group: a group cannot hold lines.
  const impact =
    usageCount > 0
      ? m.settings_category_delete_reassign({
          count: usageCount,
          fallback: fallbackLabel,
        })
      : m.settings_category_delete_unused({ label });

  return (
    // Left open on confirm: a successful delete unmounts the row, and a failed
    // one keeps the dialog available to retry.
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        <TrashIcon />
        <span className="sr-only">
          {m.settings_category_delete_action({ label })}
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.settings_category_delete_title({ label })}
          </AlertDialogTitle>
          <AlertDialogDescription>{impact}</AlertDialogDescription>
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

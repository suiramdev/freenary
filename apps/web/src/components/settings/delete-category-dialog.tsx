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

interface DeleteCategoryDialogProps {
  /** Where referencing budget lines land — the parent category, or "Other". */
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
}: DeleteCategoryDialogProps) => (
  // Left open on confirm: a successful delete unmounts the row, and a failed
  // one keeps the dialog available to retry.
  <AlertDialog>
    <AlertDialogTrigger render={<Button variant="ghost" />}>
      <TrashIcon />
      <span className="sr-only">Delete {label}</span>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
        <AlertDialogDescription>
          {usageCount === 0
            ? `No budget line uses ${label}.`
            : `${usageCount} budget line${usageCount === 1 ? "" : "s"} will move to ${fallbackLabel}.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isDeleting}
          variant="destructive"
          onClick={onConfirm}
        >
          {isDeleting && <Spinner data-icon="inline-start" />}
          Delete category
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

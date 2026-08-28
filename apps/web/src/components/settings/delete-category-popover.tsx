import { Button } from "@freenary/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@freenary/ui/components/popover";
import { TrashIcon } from "@phosphor-icons/react";

interface DeleteCategoryPopoverProps {
  /** Where referencing budget lines land — the parent category, or "Other". */
  fallbackLabel: string;
  isDeleting: boolean;
  label: string;
  onConfirm: () => void;
  usageCount: number;
}

export const DeleteCategoryPopover = ({
  fallbackLabel,
  isDeleting,
  label,
  onConfirm,
  usageCount,
}: DeleteCategoryPopoverProps) => (
  <Popover>
    <PopoverTrigger
      render={
        <Button
          className="text-muted-foreground"
          size="icon-sm"
          variant="ghost"
        />
      }
    >
      <TrashIcon className="size-3" />
      <span className="sr-only">Delete {label}</span>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-64">
      <p className="text-xs">
        {usageCount === 0
          ? `No budget line uses ${label}.`
          : `${usageCount} budget line${usageCount === 1 ? "" : "s"} will move to ${fallbackLabel}.`}
      </p>
      <div className="mt-3 flex justify-end">
        <Button
          disabled={isDeleting}
          onClick={onConfirm}
          size="sm"
          variant="destructive"
        >
          Delete category
        </Button>
      </div>
    </PopoverContent>
  </Popover>
);

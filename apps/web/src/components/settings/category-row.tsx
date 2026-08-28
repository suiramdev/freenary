import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import { cn } from "@freenary/ui/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { DeleteCategoryPopover } from "@/components/settings/delete-category-popover";

interface CategoryRowProps {
  entry: CategoryEntry;
  fallbackLabel: string;
  isDeleting: boolean;
  isMoving: boolean;
  onDelete: (id: string) => void;
  onEdit: (entry: CategoryEntry) => void;
  onMove: (input: { direction: "down" | "up"; id: string }) => void;
}

export const CategoryRow = ({
  entry,
  fallbackLabel,
  isDeleting,
  isMoving,
  onDelete,
  onEdit,
  onMove,
}: CategoryRowProps) => {
  // Custom keys carry the `custom:` prefix; the mutations take the bare cuid.
  const customId = entry.key.split(":")[1] ?? "";

  return (
    <div
      className={cn(
        "border-border flex items-center gap-3 border-b px-1 py-2",
        entry.parentKey && "pl-8"
      )}
    >
      <CategoryIcon
        className="size-8 [&_svg]:size-4"
        color={entry.color}
        icon={entry.icon}
      />

      <span className="flex-1 truncate text-xs font-medium">{entry.label}</span>

      {entry.isCustom ? (
        <>
          {entry.usageCount > 0 ? (
            <span className="text-muted-foreground text-[10px]">
              {entry.usageCount} line{entry.usageCount === 1 ? "" : "s"}
            </span>
          ) : null}
          <Button
            className="text-muted-foreground"
            disabled={isMoving}
            onClick={() => onMove({ direction: "up", id: customId })}
            size="icon-sm"
            variant="ghost"
          >
            <ArrowUpIcon className="size-3" />
            <span className="sr-only">Move {entry.label} up</span>
          </Button>
          <Button
            className="text-muted-foreground"
            disabled={isMoving}
            onClick={() => onMove({ direction: "down", id: customId })}
            size="icon-sm"
            variant="ghost"
          >
            <ArrowDownIcon className="size-3" />
            <span className="sr-only">Move {entry.label} down</span>
          </Button>
          <Button
            className="text-muted-foreground"
            onClick={() => onEdit(entry)}
            size="icon-sm"
            variant="ghost"
          >
            <PencilSimpleIcon className="size-3" />
            <span className="sr-only">Edit {entry.label}</span>
          </Button>
          <DeleteCategoryPopover
            fallbackLabel={fallbackLabel}
            isDeleting={isDeleting}
            label={entry.label}
            onConfirm={() => onDelete(customId)}
            usageCount={entry.usageCount}
          />
        </>
      ) : (
        <Badge variant="outline">Built-in</Badge>
      )}
    </div>
  );
};

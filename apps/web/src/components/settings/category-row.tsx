import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@freenary/ui/components/item";
import { cn } from "@freenary/ui/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { DeleteCategoryDialog } from "@/components/settings/delete-category-dialog";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

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
  const label = categoryEntryLabel(entry);

  return (
    <Item
      className={cn("border-b-border", entry.parentKey && "pl-8")}
      render={<li />}
      size="sm"
    >
      <ItemMedia>
        <CategoryIcon
          className="size-8 [&_svg]:size-4"
          color={entry.color}
          icon={entry.icon}
        />
      </ItemMedia>

      <ItemContent className="min-w-0">
        <ItemTitle className="block w-full truncate">{label}</ItemTitle>
      </ItemContent>

      <ItemActions>
        {entry.isCustom ? (
          <>
            {entry.usageCount > 0 ? (
              <span className="text-muted-foreground text-[0.625rem]">
                {m.settings_category_line_count({
                  count: entry.usageCount,
                })}
              </span>
            ) : null}
            <Button
              disabled={isMoving}
              onClick={() => onMove({ direction: "up", id: customId })}
              variant="ghost"
            >
              <ArrowUpIcon />
              <span className="sr-only">
                {m.settings_category_move_up({ label })}
              </span>
            </Button>
            <Button
              disabled={isMoving}
              onClick={() => onMove({ direction: "down", id: customId })}
              variant="ghost"
            >
              <ArrowDownIcon />
              <span className="sr-only">
                {m.settings_category_move_down({ label })}
              </span>
            </Button>
            <Button onClick={() => onEdit(entry)} variant="ghost">
              <PencilSimpleIcon />
              <span className="sr-only">
                {m.settings_category_edit_action({ label })}
              </span>
            </Button>
            <DeleteCategoryDialog
              fallbackLabel={fallbackLabel}
              isDeleting={isDeleting}
              label={label}
              onConfirm={() => onDelete(customId)}
              usageCount={entry.usageCount}
            />
          </>
        ) : (
          <Badge variant="outline">{m.settings_category_built_in()}</Badge>
        )}
      </ItemActions>
    </Item>
  );
};

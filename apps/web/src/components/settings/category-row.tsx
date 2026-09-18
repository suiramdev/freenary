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
import { useRegisterFluidHoverItem } from "@freenary/ui/hooks/use-fluid-hover";
import { useSize } from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";
import { RiArrowDownLine, RiArrowUpLine, RiPencilLine } from "@remixicon/react";
import { useRef } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { DeleteCategoryDialog } from "@/components/settings/delete-category-dialog";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface CategoryRowProps {
  entry: CategoryEntry;
  fallbackLabel: string;
  index: number;
  isDeleting: boolean;
  isMoving: boolean;
  onDelete: (id: string) => void;
  onEdit: (entry: CategoryEntry) => void;
  onMove: (input: { direction: "down" | "up"; id: string }) => void;
  registerItem: (index: number, element: HTMLElement | null) => void;
}

export const CATEGORY_CHIP_BOX = {
  compact: "size-6 [&_svg]:size-3.5",
  default: "size-7 [&_svg]:size-4",
} as const;

const ROW_ABOVE_HOVER_FILL = "relative z-10";
const ROW_DIVIDER_WITHOUT_HEIGHT =
  "shadow-[inset_0_-1px_0_var(--color-border)]";

const CUSTOM_CATEGORY_KEY_PREFIX = "custom:";

const bareCustomIdFromCategoryKey = (key: string): string =>
  key.startsWith(CUSTOM_CATEGORY_KEY_PREFIX)
    ? key.slice(CUSTOM_CATEGORY_KEY_PREFIX.length)
    : "";

export const CategoryRow = ({
  entry,
  fallbackLabel,
  index,
  isDeleting,
  isMoving,
  onDelete,
  onEdit,
  onMove,
  registerItem,
}: CategoryRowProps) => {
  const customId = bareCustomIdFromCategoryKey(entry.key);
  const label = categoryEntryLabel(entry);
  const rowRef = useRef<HTMLDivElement>(null);
  const { control, text, variant } = useSize();

  useRegisterFluidHoverItem(registerItem, index, rowRef);

  return (
    <Item
      className={cn(
        ROW_ABOVE_HOVER_FILL,
        ROW_DIVIDER_WITHOUT_HEIGHT,
        "border-0 px-3 py-0",
        control,
        entry.parentKey && "pl-8"
      )}
      ref={rowRef}
      render={<li />}
      size="sm"
    >
      <ItemMedia>
        <CategoryIcon
          className={CATEGORY_CHIP_BOX[variant]}
          color={entry.color}
          icon={entry.icon}
        />
      </ItemMedia>

      <ItemContent className="min-w-0">
        <ItemTitle className={cn("block w-full truncate", text)}>
          {label}
        </ItemTitle>
      </ItemContent>

      <ItemActions>
        {entry.isCustom ? (
          <>
            {entry.usageCount > 0 ? (
              <span className="text-muted-foreground text-[11px]">
                {m.settings_category_line_count({
                  count: entry.usageCount,
                })}
              </span>
            ) : null}
            <Button
              disabled={isMoving}
              onClick={() => onMove({ direction: "up", id: customId })}
              size="icon-compact"
              variant="ghost"
            >
              <RiArrowUpLine />
              <span className="sr-only">
                {m.settings_category_move_up({ label })}
              </span>
            </Button>
            <Button
              disabled={isMoving}
              onClick={() => onMove({ direction: "down", id: customId })}
              size="icon-compact"
              variant="ghost"
            >
              <RiArrowDownLine />
              <span className="sr-only">
                {m.settings_category_move_down({ label })}
              </span>
            </Button>
            <Button
              onClick={() => onEdit(entry)}
              size="icon-compact"
              variant="ghost"
            >
              <RiPencilLine />
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
          <Badge variant="dot">{m.settings_category_built_in()}</Badge>
        )}
      </ItemActions>
    </Item>
  );
};

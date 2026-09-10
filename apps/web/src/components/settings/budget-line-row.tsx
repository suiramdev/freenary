import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import { Field, FieldError } from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-addons";
import { RiDeleteBinLine, RiDraggable } from "@remixicon/react";
import { Reorder, useDragControls } from "motion/react";
import type { KeyboardEvent } from "react";
import { useState } from "react";

import { CategoryPicker } from "@/components/settings/category-picker";
import type { EditorLine } from "@/hooks/settings/use-budget-profile-editor";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface BudgetLineRowProps {
  categories: CategoryEntry[];
  error: string | undefined;
  line: EditorLine;
  onCreateCategory: (lineId: string) => void;
  onMove: (id: string, direction: "down" | "up") => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditorLine>) => void;
}

const SETTLE_WHERE_DROPPED_TRANSITION = {
  bounce: 0,
  duration: 0.3,
  type: "spring",
} as const;

export const BudgetLineRow = ({
  categories,
  error,
  line,
  onCreateCategory,
  onMove,
  onRemove,
  onUpdate,
}: BudgetLineRowProps) => {
  const handleOnlyDragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const selected = categories.find((entry) => entry.key === line.categoryKey);
  const categoryLabel = selected ? categoryEntryLabel(selected) : "";
  const displayName = line.label.trim() || categoryLabel;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();
    onMove(line.id, event.key === "ArrowUp" ? "up" : "down");
  };

  return (
    <Reorder.Item
      as="div"
      className="rounded-md transition-[box-shadow,scale] duration-150 ease-out data-[dragging=true]:scale-[1.01] data-[dragging=true]:shadow-md"
      data-dragging={isDragging ? "true" : undefined}
      dragControls={handleOnlyDragControls}
      dragListener={false}
      onDragEnd={() => setIsDragging(false)}
      onDragStart={() => setIsDragging(true)}
      transition={SETTLE_WHERE_DROPPED_TRANSITION}
      value={line}
    >
      <Field data-invalid={Boolean(error)}>
        <div className="flex items-center gap-2">
          <Button
            className="cursor-grab touch-none active:cursor-grabbing"
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => handleOnlyDragControls.start(event)}
            variant="ghost"
          >
            <RiDraggable />
            <span className="sr-only">
              {displayName
                ? m.settings_line_reorder({ label: displayName })
                : m.settings_line_reorder_untitled()}
            </span>
          </Button>

          <Input
            aria-invalid={Boolean(error)}
            aria-label={m.settings_field_name_optional()}
            className="min-w-0 flex-1"
            onChange={(event) =>
              onUpdate(line.id, { label: event.target.value })
            }
            placeholder={categoryLabel || m.settings_field_name_optional()}
            value={line.label}
          />

          <InputGroup className="w-28 shrink-0">
            <InputGroupAddon>€</InputGroupAddon>
            <InputGroupInput
              aria-label={m.settings_line_amount_label()}
              inputMode="decimal"
              onChange={(event) =>
                onUpdate(line.id, { amountInput: event.target.value })
              }
              placeholder="0"
              value={line.amountInput}
            />
          </InputGroup>

          <CategoryPicker
            categories={categories}
            onCreateRequest={() => onCreateCategory(line.id)}
            onSelect={(categoryKey) => onUpdate(line.id, { categoryKey })}
            value={line.categoryKey}
          />

          <Button onClick={() => onRemove(line.id)} variant="ghost">
            <RiDeleteBinLine />
            <span className="sr-only">
              {displayName
                ? m.settings_line_remove({ label: displayName })
                : m.settings_line_remove_untitled()}
            </span>
          </Button>
        </div>

        <FieldError>{error}</FieldError>
      </Field>
    </Reorder.Item>
  );
};

import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import { Field, FieldError } from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import { TrashIcon } from "@phosphor-icons/react";

import { CategoryPicker } from "@/components/settings/category-picker";
import type { EditorLine } from "@/hooks/settings/use-budget-profile-editor";

interface BudgetLineRowProps {
  categories: CategoryEntry[];
  error: string | undefined;
  line: EditorLine;
  onCreateCategory: (lineId: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditorLine>) => void;
}

export const BudgetLineRow = ({
  categories,
  error,
  line,
  onCreateCategory,
  onRemove,
  onUpdate,
}: BudgetLineRowProps) => {
  const selectedLabel =
    categories.find((entry) => entry.key === line.categoryKey)?.label ?? "";

  const handleCategoryChange = (categoryKey: string) => {
    const newLabel =
      categories.find((entry) => entry.key === categoryKey)?.label ?? "";
    // Auto-fill the name when it is empty or still matches the previous category.
    const patch: Partial<EditorLine> =
      !line.label || line.label === selectedLabel
        ? { categoryKey, label: newLabel }
        : { categoryKey };
    onUpdate(line.id, patch);
  };

  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-center gap-2">
        <Input
          aria-invalid={Boolean(error)}
          aria-label="Name"
          className="min-w-0 flex-1"
          onChange={(event) => onUpdate(line.id, { label: event.target.value })}
          placeholder={selectedLabel || "Name"}
          value={line.label}
        />

        <InputGroup className="w-28 shrink-0">
          <InputGroupAddon>€</InputGroupAddon>
          <InputGroupInput
            aria-label="Monthly amount"
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
          onSelect={handleCategoryChange}
          value={line.categoryKey}
        />

        <Button onClick={() => onRemove(line.id)} variant="ghost">
          <TrashIcon />
          <span className="sr-only">Remove {line.label || "line"}</span>
        </Button>
      </div>

      <FieldError>{error}</FieldError>
    </Field>
  );
};

import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
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
}: BudgetLineRowProps) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <Input
        aria-label="Name"
        className="min-w-0 flex-1"
        onChange={(event) => onUpdate(line.id, { label: event.target.value })}
        placeholder="Name"
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
        onSelect={(categoryKey) => onUpdate(line.id, { categoryKey })}
        value={line.categoryKey}
      />

      <Button
        className="text-muted-foreground"
        onClick={() => onRemove(line.id)}
        size="icon-xs"
        variant="ghost"
      >
        <TrashIcon className="size-3" />
        <span className="sr-only">Remove {line.label || "line"}</span>
      </Button>
    </div>

    {error ? <p className="text-destructive text-xs">{error}</p> : null}
  </div>
);

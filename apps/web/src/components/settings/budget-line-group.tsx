import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";

import { BudgetLineRow } from "@/components/settings/budget-line-row";
import type { EditorLine } from "@/hooks/settings/use-budget-profile-editor";
import type { BudgetLineKind } from "@/lib/settings/budget-profile-sankey";

interface BudgetLineGroupProps {
  addLabel: string;
  categories: CategoryEntry[];
  description: string;
  errors: Map<string, string>;
  kind: BudgetLineKind;
  lines: EditorLine[];
  onAdd: (kind: BudgetLineKind) => void;
  onCreateCategory: (lineId: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditorLine>) => void;
  step: number;
  title: string;
}

export const BudgetLineGroup = ({
  addLabel,
  categories,
  description,
  errors,
  kind,
  lines,
  onAdd,
  onCreateCategory,
  onRemove,
  onUpdate,
  step,
  title,
}: BudgetLineGroupProps) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-col gap-0.5">
      <h3 className="text-xs font-medium">
        {step}. {title}
      </h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>

    {lines.length > 0 ? (
      <div className="flex flex-col gap-2">
        {lines.map((line) => (
          <BudgetLineRow
            categories={categories}
            error={errors.get(line.id)}
            key={line.id}
            line={line}
            onCreateCategory={onCreateCategory}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    ) : null}

    <Button
      className="self-start"
      onClick={() => onAdd(kind)}
      size="sm"
      variant="ghost"
    >
      <PlusIcon data-icon="inline-start" />
      {addLabel}
    </Button>
  </section>
);

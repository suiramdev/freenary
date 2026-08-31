import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import { Button } from "@freenary/ui/components/button";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";

import { SpendingCategorySelect } from "@/components/budget/spending-category-select";

export const TransactionCategoryPicker = ({
  category,
  isOverridden,
  onSelect,
  onReset,
}: {
  category: SpendingCategory;
  isOverridden: boolean;
  onSelect: (category: SpendingCategory) => void;
  onReset: () => void;
}) => (
  <div className="flex items-center gap-1">
    <SpendingCategorySelect
      value={category}
      onValueChange={(v) => {
        if (v) {
          onSelect(v);
        }
      }}
      showTriggerIcon={false}
    />

    {isOverridden ? (
      <Button onClick={onReset} variant="ghost">
        <ArrowCounterClockwiseIcon />
        <span className="sr-only">Reset to auto-detected category</span>
      </Button>
    ) : null}
  </div>
);

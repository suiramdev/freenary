import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import { Button } from "@freenary/ui/components/button";
import { RiResetLeftLine } from "@remixicon/react";

import { SpendingCategoryPicker } from "@/components/budget/spending-category-picker";
import { m } from "@/paraglide/messages.js";

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
    <SpendingCategoryPicker onValueChange={onSelect} value={category} />

    {isOverridden ? (
      <Button onClick={onReset} variant="ghost">
        <RiResetLeftLine />
        <span className="sr-only">{m.budget_category_reset()}</span>
      </Button>
    ) : null}
  </div>
);

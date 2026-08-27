import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import {
  ArrowCounterClockwiseIcon,
  CaretUpDownIcon,
} from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/budget/category-icon";

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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-auto justify-start gap-1.5 px-0 py-0.5 font-normal"
          />
        }
      >
        <span className="text-sm">{CATEGORY_LABELS[category]}</span>
        <CaretUpDownIcon className="text-muted-foreground size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuRadioGroup
          value={category}
          // SAFETY: RadioGroup values are constrained to SPENDING_CATEGORIES entries
          onValueChange={(v) => onSelect(v as SpendingCategory)}
        >
          {SPENDING_CATEGORIES.map((cat) => (
            <DropdownMenuRadioItem key={cat} value={cat}>
              <CategoryIcon
                {...predefinedCategoryAppearance(cat)}
                className="size-5 [&_svg]:size-3"
              />
              {CATEGORY_LABELS[cat]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    {isOverridden ? (
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onReset}
        className="text-muted-foreground"
      >
        <ArrowCounterClockwiseIcon className="size-3" />
        <span className="sr-only">Reset to auto-detected category</span>
      </Button>
    ) : null}
  </div>
);

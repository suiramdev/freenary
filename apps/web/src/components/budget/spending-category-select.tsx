import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@freenary/ui/components/select";

import { CategoryIcon } from "@/components/budget/category-icon";

const NO_PARENT = "none";

interface SpendingCategorySelectProps {
  /** Allow deselecting (renders a "None" option). */
  allowNone?: boolean;
  /** Labels the trigger from an external `FieldLabel`. */
  id?: string;
  noneLabel?: string;
  onValueChange: (value: SpendingCategory | null) => void;
  /** Show the category icon inside the trigger. @default true */
  showTriggerIcon?: boolean;
  value: SpendingCategory | null;
}

/**
 * Select of predefined spending categories with icons.
 * Used wherever a SpendingCategory needs to be picked — transaction details,
 * custom-category "Nested under", etc.
 */
export const SpendingCategorySelect = ({
  allowNone = false,
  id,
  noneLabel = "None",
  onValueChange,
  showTriggerIcon = true,
  value,
}: SpendingCategorySelectProps) => (
  <Select
    value={value ?? NO_PARENT}
    onValueChange={(next) => {
      const slug = SPENDING_CATEGORIES.find((cat) => cat === next);
      onValueChange(slug ?? null);
    }}
  >
    <SelectTrigger id={id}>
      <SelectValue>
        {(selected) => {
          const category = SPENDING_CATEGORIES.find((cat) => cat === selected);
          if (!category) {
            return noneLabel;
          }
          return (
            <>
              {showTriggerIcon && (
                <CategoryIcon
                  {...predefinedCategoryAppearance(category)}
                  className="size-5 [&_svg]:size-3"
                />
              )}
              {CATEGORY_LABELS[category]}
            </>
          );
        }}
      </SelectValue>
    </SelectTrigger>
    {/* The trigger is w-fit, so the popup needs its own floor for long labels. */}
    <SelectContent className="min-w-56">
      <SelectGroup>
        {allowNone && <SelectItem value={NO_PARENT}>{noneLabel}</SelectItem>}
        {SPENDING_CATEGORIES.map((cat) => (
          <SelectItem key={cat} value={cat}>
            <CategoryIcon
              {...predefinedCategoryAppearance(cat)}
              className="size-5 [&_svg]:size-3"
            />
            {CATEGORY_LABELS[cat]}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

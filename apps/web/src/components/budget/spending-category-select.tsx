import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import {
  CATEGORY_GROUPS,
  categoriesInGroup,
  isSpendingCategory,
} from "@freenary/api/lib/taxonomy";
import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@freenary/ui/components/select";

import { CategoryIcon } from "@/components/budget/category-icon";
import { categoryGroupLabel, categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

const NONE_VALUE = "none";

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
 * Select of predefined categories, headed by the group each belongs to. With 75
 * categories the group headings are what makes the list navigable.
 */
export const SpendingCategorySelect = ({
  allowNone = false,
  id,
  noneLabel = m.budget_category_none(),
  onValueChange,
  showTriggerIcon = true,
  value,
}: SpendingCategorySelectProps) => (
  <Select
    value={value ?? NONE_VALUE}
    // Base UI types the selected value as `any`; naming the contract here is
    // what lets the guard below decide, rather than a shape check.
    onValueChange={(next: string | null) => {
      onValueChange(next !== null && isSpendingCategory(next) ? next : null);
    }}
  >
    <SelectTrigger id={id}>
      <SelectValue>
        {(selected: string | null) => {
          if (selected === null || !isSpendingCategory(selected)) {
            return noneLabel;
          }
          return (
            <>
              {showTriggerIcon && (
                <CategoryIcon
                  {...predefinedCategoryAppearance(selected)}
                  className="size-5 [&_svg]:size-3"
                />
              )}
              {categoryLabel(selected)}
            </>
          );
        }}
      </SelectValue>
    </SelectTrigger>
    {/* The trigger is w-fit, so the popup needs its own floor for long labels. */}
    <SelectContent className="min-w-56">
      {allowNone && (
        <SelectGroup>
          <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>
        </SelectGroup>
      )}
      {CATEGORY_GROUPS.map((group) => (
        <SelectGroup key={group}>
          <SelectLabel>{categoryGroupLabel(group)}</SelectLabel>
          {categoriesInGroup(group).map((category) => (
            <SelectItem key={category} value={category}>
              <CategoryIcon
                {...predefinedCategoryAppearance(category)}
                className="size-5 [&_svg]:size-3"
              />
              {categoryLabel(category)}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
);

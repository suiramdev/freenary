import { categoryGroupAppearance } from "@freenary/api/lib/categories";
import { CATEGORY_GROUPS, isCategoryGroup } from "@freenary/api/lib/taxonomy";
import type { CategoryGroup } from "@freenary/api/lib/taxonomy";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@freenary/ui/components/select";

import { CategoryIcon } from "@/components/budget/category-icon";
import { categoryGroupLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

const NONE_VALUE = "none";

interface CategoryGroupSelectProps {
  /** Labels the trigger from an external `FieldLabel`. */
  id?: string;
  noneLabel?: string;
  onValueChange: (value: CategoryGroup | null) => void;
  value: CategoryGroup | null;
}

/**
 * Select of the sixteen category groups. A custom category nests under a group,
 * so this is what the "nested under" field offers.
 */
export const CategoryGroupSelect = ({
  id,
  noneLabel = m.budget_category_group_none(),
  onValueChange,
  value,
}: CategoryGroupSelectProps) => (
  <Select
    value={value ?? NONE_VALUE}
    // Base UI types the selected value as `any`; naming the contract here is
    // what lets the guard below decide, rather than a shape check.
    onValueChange={(next: string | null) => {
      onValueChange(next !== null && isCategoryGroup(next) ? next : null);
    }}
  >
    <SelectTrigger id={id}>
      <SelectValue>
        {(selected: string | null) => {
          if (selected === null || !isCategoryGroup(selected)) {
            return noneLabel;
          }
          return (
            <>
              <CategoryIcon
                {...categoryGroupAppearance(selected)}
                className="size-5 [&_svg]:size-3"
              />
              {categoryGroupLabel(selected)}
            </>
          );
        }}
      </SelectValue>
    </SelectTrigger>
    <SelectContent className="min-w-56">
      <SelectGroup>
        <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>
        {CATEGORY_GROUPS.map((group) => (
          <SelectItem key={group} value={group}>
            <CategoryIcon
              {...categoryGroupAppearance(group)}
              className="size-5 [&_svg]:size-3"
            />
            {categoryGroupLabel(group)}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

import { categoryGroupAppearance } from "@freenary/api/lib/categories";
import { CATEGORY_GROUPS, isCategoryGroup } from "@freenary/api/lib/taxonomy";
import type { CategoryGroup } from "@freenary/api/lib/taxonomy";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@freenary/ui/components/select";

import { categoryMenuIcon } from "@/components/budget/category-menu-icon";
import { categoryGroupLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface CategoryGroupSelectProps {
  id?: string;
  noneLabel?: string;
  onValueChange: (value: CategoryGroup | null) => void;
  value: CategoryGroup | null;
}

const NONE_VALUE = "none";

export const CategoryGroupSelect = ({
  id,
  noneLabel = m.budget_category_group_none(),
  onValueChange,
  value,
}: CategoryGroupSelectProps) => (
  <Select
    value={value ?? NONE_VALUE}
    onValueChange={(next: string | null) => {
      onValueChange(next !== null && isCategoryGroup(next) ? next : null);
    }}
  >
    <SelectTrigger id={id} placeholder={noneLabel} />
    <SelectContent className="min-w-56">
      <SelectGroup>
        <SelectItem index={0} value={NONE_VALUE}>
          {noneLabel}
        </SelectItem>
        {CATEGORY_GROUPS.map((group, position) => (
          <SelectItem
            icon={categoryMenuIcon(categoryGroupAppearance(group))}
            index={position + 1}
            key={group}
            value={group}
          >
            {categoryGroupLabel(group)}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import { isSpendingCategory } from "@freenary/api/lib/taxonomy";
import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSearch,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { RiExpandUpDownLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { matchCategoryGroups } from "@/lib/budget/category-search";
import { categoryGroupLabel, categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface SpendingCategoryPickerProps {
  onValueChange: (value: SpendingCategory) => void;
  value: SpendingCategory;
}

/**
 * Picks one of the seventy-five predefined categories, headed by the group each
 * belongs to. A menu rather than a select, because a list that long needs a
 * search field and `Select` cannot carry one.
 */
export const SpendingCategoryPicker = ({
  onValueChange,
  value,
}: SpendingCategoryPickerProps) => {
  const [query, setQuery] = useState("");

  // Seventy-five categories are too many to scan, so typing narrows them.
  const matches = useMemo(() => matchCategoryGroups(query), [query]);

  return (
    <DropdownMenu onOpenChange={() => setQuery("")}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {categoryLabel(value)}
        <RiExpandUpDownLine data-icon="inline-end" />
      </DropdownMenuTrigger>
      {/* The trigger is content-sized, so the popup needs its own floor. */}
      <DropdownMenuContent
        align="start"
        className="max-h-96 min-w-56 overflow-y-auto"
      >
        <DropdownMenuSearch
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.budget_category_search_placeholder()}
          value={query}
        />
        {matches.length === 0 && (
          <DropdownMenuEmpty>
            {m.budget_category_search_empty()}
          </DropdownMenuEmpty>
        )}
        <DropdownMenuRadioGroup
          value={value}
          // Base UI types the selected value as `any`; the guard keeps a stray
          // value from reaching a caller that only handles real categories.
          onValueChange={(next: string) => {
            if (isSpendingCategory(next)) {
              onValueChange(next);
            }
          }}
        >
          {matches.map(({ categories, group }) => (
            <DropdownMenuGroup key={group}>
              <DropdownMenuLabel>{categoryGroupLabel(group)}</DropdownMenuLabel>
              {categories.map((category) => (
                <DropdownMenuRadioItem
                  className="ps-8"
                  // One category is the whole answer, so picking one is done.
                  closeOnClick={true}
                  key={category}
                  value={category}
                >
                  <CategoryIcon
                    {...predefinedCategoryAppearance(category)}
                    className="size-5 [&_svg]:size-3"
                  />
                  {categoryLabel(category)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

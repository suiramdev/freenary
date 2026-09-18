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

export const SpendingCategoryPicker = ({
  onValueChange,
  value,
}: SpendingCategoryPickerProps) => {
  const [query, setQuery] = useState("");

  const matchingGroups = useMemo(() => matchCategoryGroups(query), [query]);

  return (
    <DropdownMenu onOpenChange={() => setQuery("")}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {categoryLabel(value)}
        <RiExpandUpDownLine data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-96 min-w-56 overflow-y-auto"
      >
        <DropdownMenuSearch
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.budget_category_search_placeholder()}
          value={query}
        />
        {matchingGroups.length === 0 && (
          <DropdownMenuEmpty>
            {m.budget_category_search_empty()}
          </DropdownMenuEmpty>
        )}
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next: string) => {
            if (isSpendingCategory(next)) {
              onValueChange(next);
            }
          }}
        >
          {matchingGroups.map(({ categories, group }) => (
            <DropdownMenuGroup key={group}>
              <DropdownMenuLabel>{categoryGroupLabel(group)}</DropdownMenuLabel>
              {categories.map((category) => (
                <DropdownMenuRadioItem
                  className="ps-8"
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

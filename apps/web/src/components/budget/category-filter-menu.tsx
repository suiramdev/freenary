import {
  categoryGroupAppearance,
  predefinedCategoryAppearance,
} from "@freenary/api/lib/categories";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSearch,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { RiFilter3Line } from "@remixicon/react";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { matchCategoryGroups } from "@/lib/budget/category-search";
import {
  filterCount,
  toggleCategory,
  toggleGroup,
} from "@/lib/budget/category-selection";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { categoryGroupLabel, categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface CategoryFilterMenuProps {
  filter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
}

export const CategoryFilterMenu = ({
  filter,
  onFilterChange,
}: CategoryFilterMenuProps) => {
  const [query, setQuery] = useState("");
  const activeCount = filterCount(filter);

  const matchingGroups = useMemo(() => matchCategoryGroups(query), [query]);

  return (
    <DropdownMenu onOpenChange={() => setQuery("")}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <RiFilter3Line data-icon="inline-start" />
        {m.budget_filter_category()}
        {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-96 min-w-64 overflow-y-auto"
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
        {matchingGroups.map(({ categories, group }) => {
          const isWholeGroupFiltered = filter.groups.includes(group);

          return (
            <DropdownMenuGroup key={group}>
              <DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={isWholeGroupFiltered}
                  onCheckedChange={() =>
                    onFilterChange(toggleGroup(filter, group))
                  }
                >
                  <CategoryIcon
                    {...categoryGroupAppearance(group)}
                    className="size-5 [&_svg]:size-3"
                  />
                  {categoryGroupLabel(group)}
                </DropdownMenuCheckboxItem>
              </DropdownMenuLabel>
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={
                    isWholeGroupFiltered || filter.categories.includes(category)
                  }
                  disabled={isWholeGroupFiltered}
                  className="ps-8"
                  onCheckedChange={() =>
                    onFilterChange(toggleCategory(filter, category))
                  }
                >
                  <CategoryIcon
                    {...predefinedCategoryAppearance(category)}
                    className="size-5 [&_svg]:size-3"
                  />
                  {categoryLabel(category)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

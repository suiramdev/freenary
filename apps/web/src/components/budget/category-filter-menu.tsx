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

/** The transaction list's category filter: sixteen groups and what they hold. */
export const CategoryFilterMenu = ({
  filter,
  onFilterChange,
}: CategoryFilterMenuProps) => {
  const [query, setQuery] = useState("");
  const activeCount = filterCount(filter);

  // Seventy-five categories are too many to scan, so typing narrows them.
  const matches = useMemo(() => matchCategoryGroups(query), [query]);

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
        {matches.length === 0 && (
          <DropdownMenuEmpty>
            {m.budget_category_search_empty()}
          </DropdownMenuEmpty>
        )}
        {matches.map(({ categories, group }) => {
          const isGroupActive = filter.groups.includes(group);
          return (
            <DropdownMenuGroup key={group}>
              <DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={isGroupActive}
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
                  // The server unions groups into their categories, so a ticked
                  // group already covers these rows; showing them unchecked
                  // would misreport what is being filtered, and toggling one
                  // would change no result.
                  checked={
                    isGroupActive || filter.categories.includes(category)
                  }
                  disabled={isGroupActive}
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

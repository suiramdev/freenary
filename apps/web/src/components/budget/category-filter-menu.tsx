import {
  categoryGroupAppearance,
  predefinedCategoryAppearance,
} from "@freenary/api/lib/categories";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownEmpty,
  DropdownMenu,
  DropdownSearch,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { MenuItem } from "@freenary/ui/components/menu-item";
import { RiFilter3Line } from "@remixicon/react";
import { useMemo, useState } from "react";

import { categoryMenuIcon } from "@/components/budget/category-menu-icon";
import { matchCategoryGroups } from "@/lib/budget/category-search";
import {
  filterCount,
  toggleCategory,
  toggleGroup,
} from "@/lib/budget/category-selection";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { remixIcon } from "@/lib/remix-icon";
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

  // Fluid Functionalism menu rows register by flat index across the popup,
  // so group headers and their categories share one running count.
  const { checkedIndices, rows } = useMemo(() => {
    const flat: (
      | { kind: "group"; group: (typeof matches)[number]["group"] }
      | {
          kind: "category";
          category: (typeof matches)[number]["categories"][number];
          groupActive: boolean;
        }
    )[] = [];
    const checked: number[] = [];
    for (const { categories, group } of matches) {
      const isGroupActive = filter.groups.includes(group);
      if (isGroupActive) {
        checked.push(flat.length);
      }
      flat.push({ group, kind: "group" });
      for (const category of categories) {
        // The server unions groups into their categories, so a ticked group
        // already covers these rows; showing them unchecked would misreport
        // what is being filtered, and toggling one would change no result.
        if (isGroupActive || filter.categories.includes(category)) {
          checked.push(flat.length);
        }
        flat.push({ category, groupActive: isGroupActive, kind: "category" });
      }
    }
    return { checkedIndices: checked, rows: flat };
  }, [matches, filter]);

  return (
    <DropdownMenu onOpenChange={() => setQuery("")}>
      <DropdownTrigger
        render={
          <Button leadingIcon={remixIcon(RiFilter3Line)} variant="tertiary" />
        }
      >
        {m.budget_filter_category()}
        {activeCount > 0 && <Badge>{activeCount}</Badge>}
      </DropdownTrigger>
      <DropdownContent
        align="end"
        checkedIndices={checkedIndices}
        className="max-h-96 min-w-64 overflow-y-auto"
      >
        <DropdownSearch
          onValueChange={setQuery}
          placeholder={m.budget_category_search_placeholder()}
          value={query}
        />
        {rows.length === 0 && (
          <DropdownEmpty>{m.budget_category_search_empty()}</DropdownEmpty>
        )}
        {rows.map((row, index) =>
          row.kind === "group" ? (
            <MenuItem
              checked={filter.groups.includes(row.group)}
              icon={categoryMenuIcon(categoryGroupAppearance(row.group))}
              index={index}
              key={row.group}
              label={categoryGroupLabel(row.group)}
              onSelect={() => onFilterChange(toggleGroup(filter, row.group))}
            />
          ) : (
            <MenuItem
              checked={
                row.groupActive || filter.categories.includes(row.category)
              }
              className="ps-8"
              disabled={row.groupActive}
              icon={categoryMenuIcon(
                predefinedCategoryAppearance(row.category)
              )}
              index={index}
              key={row.category}
              label={categoryLabel(row.category)}
              onSelect={() =>
                onFilterChange(toggleCategory(filter, row.category))
              }
            />
          )
        )}
      </DropdownContent>
    </DropdownMenu>
  );
};

import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownEmpty,
  DropdownLabel,
  DropdownMenu,
  DropdownSearch,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { MenuItem } from "@freenary/ui/components/menu-item";
import { RiExpandUpDownLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { categoryMenuIcon } from "@/components/budget/category-menu-icon";
import { matchCategoryGroups } from "@/lib/budget/category-search";
import { remixIcon } from "@/lib/remix-icon";
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

  // Fluid Functionalism menu rows register by flat index across the popup,
  // so each group carries the offset its categories start at.
  const grouped = useMemo(() => {
    const sections: {
      categories: (typeof matches)[number]["categories"];
      group: (typeof matches)[number]["group"];
      offset: number;
    }[] = [];
    let offset = 0;
    for (const { categories, group } of matches) {
      sections.push({ categories, group, offset });
      offset += categories.length;
    }
    return sections;
  }, [matches]);
  const checkedIndex = matches
    .flatMap(({ categories }) => categories)
    .indexOf(value);

  return (
    <DropdownMenu onOpenChange={() => setQuery("")}>
      <DropdownTrigger
        render={
          <Button
            trailingIcon={remixIcon(RiExpandUpDownLine)}
            variant="tertiary"
          />
        }
      >
        {categoryLabel(value)}
      </DropdownTrigger>
      {/* The trigger is content-sized, so the popup needs its own floor. */}
      <DropdownContent
        align="start"
        checkedIndex={checkedIndex === -1 ? undefined : checkedIndex}
        className="max-h-96 min-w-56 overflow-y-auto"
      >
        <DropdownSearch
          onValueChange={setQuery}
          placeholder={m.budget_category_search_placeholder()}
          value={query}
        />
        {matches.length === 0 && (
          <DropdownEmpty>{m.budget_category_search_empty()}</DropdownEmpty>
        )}
        {grouped.map(({ categories, group, offset }) => (
          <div key={group}>
            <DropdownLabel>{categoryGroupLabel(group)}</DropdownLabel>
            {categories.map((category, position) => (
              <MenuItem
                checked={value === category}
                className="ps-8"
                icon={categoryMenuIcon(predefinedCategoryAppearance(category))}
                index={offset + position}
                key={category}
                label={categoryLabel(category)}
                onSelect={() => onValueChange(category)}
              />
            ))}
          </div>
        ))}
      </DropdownContent>
    </DropdownMenu>
  );
};

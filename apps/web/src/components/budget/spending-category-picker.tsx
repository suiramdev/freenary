import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import { CATEGORY_GROUPS, categoriesInGroup } from "@freenary/api/lib/taxonomy";
import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@freenary/ui/components/combobox";
import { useMemo } from "react";

import { categoryMenuIcon } from "@/components/budget/category-menu-icon";
import { categoryRowMatches } from "@/lib/budget/category-search";
import type { CategoryRow } from "@/lib/budget/category-search";
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
  const items = useMemo<CategoryRow[]>(
    () =>
      CATEGORY_GROUPS.flatMap((group) =>
        categoriesInGroup(group).map((category) => ({
          group: categoryGroupLabel(group),
          label: categoryLabel(category),
          value: category,
        }))
      ),
    []
  );

  return (
    <Combobox
      filter={categoryRowMatches}
      items={items}
      onValueChange={(next) => {
        if (next !== "") {
          // SAFETY: every row's value is a SpendingCategory from the taxonomy.
          onValueChange(next as SpendingCategory);
        }
      }}
      value={value}
    >
      <ComboboxInput placeholder={m.budget_category_search_placeholder()} />
      <ComboboxContent align="start">
        <ComboboxEmpty>{m.budget_category_search_empty()}</ComboboxEmpty>
        <ComboboxList>
          {(item) => {
            // SAFETY: every row comes from `items`, built above.
            const row = item as CategoryRow;

            return (
              <ComboboxItem
                icon={categoryMenuIcon(
                  // SAFETY: as above — the rows come from the taxonomy.
                  predefinedCategoryAppearance(row.value as SpendingCategory)
                )}
                value={row.value}
              >
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span className="truncate">{row.label}</span>
                  <span className="text-muted-foreground shrink-0 text-[11px]">
                    {row.group}
                  </span>
                </span>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

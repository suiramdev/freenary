import { CATEGORY_GROUPS, categoriesInGroup } from "@freenary/api/lib/taxonomy";
import type {
  CategoryGroup,
  SpendingCategory,
} from "@freenary/api/lib/taxonomy";

import { foldForSearch } from "@/lib/search-text";
import { categoryGroupLabel, categoryLabel } from "@/lib/taxonomy-labels";

/** A group and the categories under it that survived the query. */
export interface CategoryGroupMatch {
  categories: readonly SpendingCategory[];
  group: CategoryGroup;
}

/**
 * Narrows the predefined taxonomy by translated label, so a French reader
 * searches the words they can see. A group whose own name matches keeps all its
 * categories; a group with nothing left is dropped, so no heading survives
 * without something under it.
 */
export const matchCategoryGroups = (query: string): CategoryGroupMatch[] => {
  const needle = foldForSearch(query.trim());
  const matches: CategoryGroupMatch[] = [];

  for (const group of CATEGORY_GROUPS) {
    const keepsAll =
      !needle || foldForSearch(categoryGroupLabel(group)).includes(needle);
    const categories = keepsAll
      ? categoriesInGroup(group)
      : categoriesInGroup(group).filter((category) =>
          foldForSearch(categoryLabel(category)).includes(needle)
        );

    if (categories.length > 0) {
      matches.push({ categories, group });
    }
  }

  return matches;
};

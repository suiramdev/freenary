import { categoriesInGroup } from "@freenary/api/lib/taxonomy";
import type {
  CategoryGroup,
  SpendingCategory,
} from "@freenary/api/lib/taxonomy";

/** What the user clicked: a level-2 group or a level-3 category. */
export type CategorySelection =
  | { category: SpendingCategory; kind: "category" }
  | { group: CategoryGroup; kind: "group" };

/** The transaction list's category filter, as the API expects it. */
export interface CategoryFilter {
  categories: SpendingCategory[];
  groups: CategoryGroup[];
}

export const EMPTY_CATEGORY_FILTER: CategoryFilter = {
  categories: [],
  groups: [],
};

const isOnlyActive = (filter: CategoryFilter, selection: CategorySelection) => {
  if (selection.kind === "group") {
    return (
      filter.groups.length === 1 &&
      filter.categories.length === 0 &&
      filter.groups[0] === selection.group
    );
  }
  return (
    filter.categories.length === 1 &&
    filter.groups.length === 0 &&
    filter.categories[0] === selection.category
  );
};

/** Clicking a chart node filters on it; clicking the active one clears it. */
export const toggleCategoryFilter = (
  filter: CategoryFilter,
  selection: CategorySelection | null
): CategoryFilter => {
  if (selection === null || isOnlyActive(filter, selection)) {
    return EMPTY_CATEGORY_FILTER;
  }
  return selection.kind === "group"
    ? { categories: [], groups: [selection.group] }
    : { categories: [selection.category], groups: [] };
};

export const filterCount = (filter: CategoryFilter) =>
  filter.categories.length + filter.groups.length;

export const toggleCategory = (
  filter: CategoryFilter,
  category: SpendingCategory
): CategoryFilter => ({
  ...filter,
  categories: filter.categories.includes(category)
    ? filter.categories.filter((c) => c !== category)
    : [...filter.categories, category],
});

/**
 * Picking a group filters on the whole group rather than expanding into nine
 * category chips the user then has to unpick one by one. Its categories are
 * dropped because the server unions them in anyway, so their chips would count
 * toward the badge while changing no result.
 */
export const toggleGroup = (
  filter: CategoryFilter,
  group: CategoryGroup
): CategoryFilter => {
  if (filter.groups.includes(group)) {
    return { ...filter, groups: filter.groups.filter((g) => g !== group) };
  }
  const covered = new Set<SpendingCategory>(categoriesInGroup(group));
  return {
    categories: filter.categories.filter((c) => !covered.has(c)),
    groups: [...filter.groups, group],
  };
};

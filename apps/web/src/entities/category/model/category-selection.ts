import { categoriesInGroup } from "@freenary/api/lib/taxonomy";
import type {
  CategoryGroup,
  SpendingCategory,
} from "@freenary/api/lib/taxonomy";

export type CategorySelection =
  | { category: SpendingCategory; kind: "category" }
  | { group: CategoryGroup; kind: "group" };

export interface CategoryFilter {
  categories: SpendingCategory[];
  groups: CategoryGroup[];
}

export const EMPTY_CATEGORY_FILTER: CategoryFilter = {
  categories: [],
  groups: [],
};

const isTheOnlyActiveFilter = (
  filter: CategoryFilter,
  selection: CategorySelection
) => {
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

export const toggleCategoryFilter = (
  filter: CategoryFilter,
  selection: CategorySelection | null
): CategoryFilter => {
  if (selection === null || isTheOnlyActiveFilter(filter, selection)) {
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

export const toggleGroup = (
  filter: CategoryFilter,
  group: CategoryGroup
): CategoryFilter => {
  if (filter.groups.includes(group)) {
    return { ...filter, groups: filter.groups.filter((g) => g !== group) };
  }

  const coveredByTheGroup = new Set<SpendingCategory>(categoriesInGroup(group));

  return {
    categories: filter.categories.filter((c) => !coveredByTheGroup.has(c)),
    groups: [...filter.groups, group],
  };
};

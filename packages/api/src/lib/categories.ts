import {
  CATEGORY_GROUP_COLORS,
  CATEGORY_GROUP_ICONS,
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  categoriesInGroup,
  categoryColor,
  categoryIcon,
  isSpendingCategory,
} from "./taxonomy";
import type {
  CategoryColor,
  CategoryGroup,
  CategoryIconName,
  SpendingCategory,
} from "./taxonomy";

export const CUSTOM_CATEGORY_PREFIX = "custom:";

/**
 * A node of the hierarchy as the UI consumes it: groups, predefined categories
 * and custom categories share one key space, flattened into display order.
 */
export interface CategoryEntry {
  color: CategoryColor;
  icon: CategoryIconName;
  isCustom: boolean;
  /**
   * A level-2 group. Predefined groups are headers only; a custom group is
   * assignable because it has no categories of its own to pick instead.
   */
  isGroup: boolean;
  /** Whether a budget line may reference this entry. */
  isAssignable: boolean;
  /** Predefined slug, or `custom:<cuid>`. */
  key: string;
  label: string;
  /** Group slug this entry sits in; null for a group itself. */
  parentKey: string | null;
  /** Budget lines assigned to this entry; always 0 for predefined entries. */
  usageCount: number;
}

export const customCategoryKey = (id: string): string =>
  `${CUSTOM_CATEGORY_PREFIX}${id}`;

/** Splits a category key into the column it is stored in; null when malformed or unknown. */
export const parseCategoryKey = (
  key: string
):
  | { customId: string; slug: null }
  | { customId: null; slug: SpendingCategory }
  | null => {
  if (key.startsWith(CUSTOM_CATEGORY_PREFIX)) {
    const customId = key.slice(CUSTOM_CATEGORY_PREFIX.length);
    return customId ? { customId, slug: null } : null;
  }

  // A group is a header, not a value a budget line may carry.
  return isSpendingCategory(key) ? { customId: null, slug: key } : null;
};

/** Everything needed to render a category's glyph, whether predefined or custom. */
export interface CategoryAppearance {
  color: CategoryColor;
  icon: CategoryIconName;
}

export const predefinedCategoryAppearance = (
  category: SpendingCategory
): CategoryAppearance => ({
  color: categoryColor(category),
  icon: categoryIcon(category),
});

export const categoryGroupAppearance = (
  group: CategoryGroup
): CategoryAppearance => ({
  color: CATEGORY_GROUP_COLORS[group],
  icon: CATEGORY_GROUP_ICONS[group],
});

const groupEntry = (group: CategoryGroup): CategoryEntry => ({
  color: CATEGORY_GROUP_COLORS[group],
  icon: CATEGORY_GROUP_ICONS[group],
  isAssignable: false,
  isCustom: false,
  isGroup: true,
  key: group,
  label: CATEGORY_GROUP_LABELS[group],
  parentKey: null,
  usageCount: 0,
});

const categoryEntry = (
  category: SpendingCategory,
  group: CategoryGroup
): CategoryEntry => ({
  color: categoryColor(category),
  icon: categoryIcon(category),
  isAssignable: true,
  isCustom: false,
  isGroup: false,
  key: category,
  label: CATEGORY_LABELS[category],
  parentKey: group,
  usageCount: 0,
});

export interface PredefinedCategoryGroup {
  categories: CategoryEntry[];
  group: CategoryEntry;
}

/** The predefined hierarchy: every group with the categories it holds. */
export const predefinedCategoryGroups = (): PredefinedCategoryGroup[] =>
  CATEGORY_GROUPS.map((group) => ({
    categories: categoriesInGroup(group).map((category) =>
      categoryEntry(category, group)
    ),
    group: groupEntry(group),
  }));

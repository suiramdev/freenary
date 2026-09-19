import {
  CATEGORY_GROUP_FALLBACKS,
  CATEGORY_GROUP_OF,
  resolveCategoryGroup,
  resolveCategorySlug,
} from "./taxonomy";
import type { CategoryGroup, SpendingCategory } from "./taxonomy";

export interface CategoryRef {
  categorySlug: string | null;
  parentSlug: string | null;
}

export interface PlannedLine extends CategoryRef {
  amount: number;
}

const GROUP_OUTSIDE_THE_TAXONOMY = "spending" satisfies CategoryGroup;

const AVERAGE_MONTH_MS = 30.436875 * 24 * 60 * 60 * 1000;

export const groupOfCategoryRef = (ref: CategoryRef): CategoryGroup => {
  const slug = ref.categorySlug ? resolveCategorySlug(ref.categorySlug) : null;

  if (slug) {
    return CATEGORY_GROUP_OF[slug];
  }

  const parent = ref.parentSlug ? resolveCategoryGroup(ref.parentSlug) : null;

  return parent ?? GROUP_OUTSIDE_THE_TAXONOMY;
};

export const categoryOfCategoryRef = (ref: CategoryRef): SpendingCategory => {
  const slug = ref.categorySlug ? resolveCategorySlug(ref.categorySlug) : null;

  return slug ?? CATEGORY_GROUP_FALLBACKS[groupOfCategoryRef(ref)];
};

export const monthSpan = (from: Date, to: Date): number =>
  Math.max(1, Math.round((to.getTime() - from.getTime()) / AVERAGE_MONTH_MS));

export const periodMonthCount = (from: Date, to: Date, now: Date): number => {
  const elapsedEnd = to.getTime() < now.getTime() ? to : now;

  return monthSpan(from, elapsedEnd);
};

export const plannedByCategory = (
  lines: PlannedLine[],
  monthCount: number
): Map<SpendingCategory, number> => {
  const planned = new Map<SpendingCategory, number>();

  for (const line of lines) {
    const category = categoryOfCategoryRef(line);

    planned.set(
      category,
      (planned.get(category) ?? 0) + line.amount * monthCount
    );
  }

  return planned;
};

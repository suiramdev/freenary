import {
  CATEGORY_GROUP_OF,
  isCategoryGroup,
  resolveCategorySlug,
} from "./taxonomy";
import type { CategoryGroup } from "./taxonomy";

export interface CategoryRef {
  categorySlug: string | null;
  parentSlug: string | null;
}

export interface PlannedLine extends CategoryRef {
  amount: number;
}

const GROUP_OUTSIDE_THE_TAXONOMY = "other" satisfies CategoryGroup;

const AVERAGE_MONTH_MS = 30.436875 * 24 * 60 * 60 * 1000;

export const groupOfCategoryRef = (ref: CategoryRef): CategoryGroup => {
  const slug = ref.categorySlug ? resolveCategorySlug(ref.categorySlug) : null;

  if (slug) {
    return CATEGORY_GROUP_OF[slug];
  }

  if (ref.parentSlug && isCategoryGroup(ref.parentSlug)) {
    return ref.parentSlug;
  }

  return GROUP_OUTSIDE_THE_TAXONOMY;
};

export const monthSpan = (from: Date, to: Date): number =>
  Math.max(1, Math.round((to.getTime() - from.getTime()) / AVERAGE_MONTH_MS));

export const periodMonthCount = (from: Date, to: Date, now: Date): number => {
  const elapsedEnd = to.getTime() < now.getTime() ? to : now;

  return monthSpan(from, elapsedEnd);
};

export const plannedByGroup = (
  lines: PlannedLine[],
  monthCount: number
): Map<CategoryGroup, number> => {
  const planned = new Map<CategoryGroup, number>();

  for (const line of lines) {
    const group = groupOfCategoryRef(line);

    planned.set(group, (planned.get(group) ?? 0) + line.amount * monthCount);
  }

  return planned;
};

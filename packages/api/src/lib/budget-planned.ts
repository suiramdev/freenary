import {
  CATEGORY_GROUP_OF,
  isCategoryGroup,
  resolveCategorySlug,
} from "./taxonomy";
import type { CategoryGroup } from "./taxonomy";

/** The slugs that can name a budget line's category group. */
export interface CategoryRef {
  categorySlug: string | null;
  /** The line's custom category's parentSlug; null for a predefined slug or a group of its own. */
  parentSlug: string | null;
}

/** A budget line reduced to its monthly amount and the slugs that name its group. */
export interface PlannedLine extends CategoryRef {
  amount: number;
}

export const groupOfCategoryRef = (ref: CategoryRef): CategoryGroup => {
  // A stored slug may predate the hierarchy, so decode it before mapping.
  const slug = ref.categorySlug ? resolveCategorySlug(ref.categorySlug) : null;
  if (slug) {
    return CATEGORY_GROUP_OF[slug];
  }
  if (ref.parentSlug && isCategoryGroup(ref.parentSlug)) {
    return ref.parentSlug;
  }
  // A custom category that is a group of its own has no taxonomy group to sit in.
  return "other";
};

/** Mean Gregorian month, so a whole-month span rounds to its own month count. */
const AVERAGE_MONTH_MS = 30.436875 * 24 * 60 * 60 * 1000;

/**
 * How many months a period covers. Counting calendar keys would miscount: the
 * client sends local month boundaries, so a UTC server reads `from` as the
 * previous month and doubles a one-month plan. Rounding the span is immune to
 * that offset because every range the navigator produces is whole months.
 */
export const monthSpan = (from: Date, to: Date): number =>
  Math.max(1, Math.round((to.getTime() - from.getTime()) / AVERAGE_MONTH_MS));

/**
 * A period's month count for scaling a plan, clamped to `now`: an unfinished
 * period has only earned the plan of its elapsed months, so a user exactly on
 * plan does not read as months under budget mid-period.
 */
export const periodMonthCount = (from: Date, to: Date, now: Date): number =>
  monthSpan(from, to.getTime() < now.getTime() ? to : now);

/**
 * Planned amounts per category group, scaled to the period.
 * `monthCount` is the period's month count for totals and 1 for the per-month
 * aggregations, where a monthly plan is already the comparable figure.
 */
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

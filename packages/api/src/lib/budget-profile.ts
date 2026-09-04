import { groupOfCategoryRef } from "./budget-planned";
import type { CategoryRef } from "./budget-planned";
import { isCategoryGroup } from "./taxonomy";
import type { CategoryGroup } from "./taxonomy";

/**
 * Bounds for a budget line's planned amount, shared by the router that validates
 * a save and the editor that blocks one. `BudgetLine.amount` is a Postgres
 * INTEGER, so anything larger fails at insert time rather than validation time.
 */
export const MAX_AMOUNT_MINOR_UNITS = 2_147_483_647;

export const MAX_BUDGET_LINE_LABEL_LENGTH = 60;

export const MAX_BUDGET_LINES = 200;

/** Where a budget line sits in the revenues → investments → outgoings flow. */
export type BudgetLineKind = "INVESTMENT" | "OUTGOING" | "REVENUE";

/**
 * Which side of the flow each group falls on. Exhaustive over `CategoryGroup`
 * so a new group has to declare its side instead of silently reading as an
 * outgoing.
 */
const KIND_BY_GROUP = {
  "daily-living": "OUTGOING",
  education: "OUTGOING",
  financial: "OUTGOING",
  health: "OUTGOING",
  housing: "OUTGOING",
  income: "REVENUE",
  investments: "INVESTMENT",
  leisure: "OUTGOING",
  other: "OUTGOING",
  shopping: "OUTGOING",
  subscriptions: "OUTGOING",
  taxes: "OUTGOING",
  transfers: "OUTGOING",
  transport: "OUTGOING",
  travel: "OUTGOING",
  utilities: "OUTGOING",
} as const satisfies Record<CategoryGroup, BudgetLineKind>;

/**
 * A line's role, read off the group its category sits in. Derived rather than
 * declared: the profile states a category and nothing else, so there is no
 * second field that a re-parented category could leave stale.
 *
 * A custom category that is a group of its own names no taxonomy group, and an
 * allocation is the only reading left for it.
 */
export const budgetLineKindOfGroup = (
  groupKey: string | null
): BudgetLineKind =>
  groupKey && isCategoryGroup(groupKey) ? KIND_BY_GROUP[groupKey] : "OUTGOING";

export const budgetLineKindOf = (ref: CategoryRef): BudgetLineKind =>
  budgetLineKindOfGroup(groupOfCategoryRef(ref));

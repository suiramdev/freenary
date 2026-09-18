import { groupOfCategoryRef } from "./budget-planned";
import type { CategoryRef } from "./budget-planned";
import { isCategoryGroup } from "./taxonomy";
import type { CategoryGroup } from "./taxonomy";

export type BudgetLineKind = "INVESTMENT" | "OUTGOING" | "REVENUE";

export const MAX_AMOUNT_MINOR_UNITS = 2_147_483_647;

export const MAX_BUDGET_LINE_LABEL_LENGTH = 60;

export const MAX_BUDGET_LINES = 200;

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

const KIND_OF_A_LINE_WITHOUT_A_GROUP = "OUTGOING" satisfies BudgetLineKind;

export const budgetLineKindOfGroup = (
  groupKey: string | null
): BudgetLineKind =>
  groupKey && isCategoryGroup(groupKey)
    ? KIND_BY_GROUP[groupKey]
    : KIND_OF_A_LINE_WITHOUT_A_GROUP;

export const budgetLineKindOf = (ref: CategoryRef): BudgetLineKind =>
  budgetLineKindOfGroup(groupOfCategoryRef(ref));

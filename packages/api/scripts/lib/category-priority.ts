import { CATEGORY_GROUP_OF } from "../../src/lib/taxonomy";
import type { CategoryGroup, SpendingCategory } from "../../src/lib/taxonomy";

/**
 * When a brand spans multiple categories (e.g. Carrefour has supermarket + fuel
 * entries), the dictionary build keeps the highest-priority one present — never
 * the most frequent.
 *
 * `transport` and `shopping` are the most incidental: chains bolt on fuel pumps,
 * charging bays and gift shops. They must lose to a more specific consumer
 * intent. A brand with ONLY fuel entries (Esso, Shell) still keeps transport.
 */
const GROUP_PRIORITY = {
  "daily-living": 10,
  education: 5,
  financial: 4,
  health: 9,
  housing: 0,
  income: 0,
  investments: 0,
  leisure: 3,
  other: 0,
  shopping: 2,
  subscriptions: 0,
  taxes: 0,
  transfers: 0,
  transport: 1,
  travel: 6,
  utilities: 8,
} as const satisfies Record<CategoryGroup, number>;

/**
 * Leaves whose rank is not their group's. Two reasons, both load-bearing: a
 * beauty or DIY aisle is as incidental as a gift shop even though its group is
 * not, and eating out must keep losing to groceries so a supermarket with a café
 * does not resolve on whichever entry the scan happened to reach first.
 */
const LEAF_PRIORITY = {
  "bars-cafes": 7,
  "home-maintenance": 2,
  "household-supplies": 2,
  "personal-care": 2,
  pets: 2,
  restaurants: 7,
  takeaway: 7,
} as const satisfies Partial<Record<SpendingCategory, number>>;

export const categoryPriority = (category: SpendingCategory): number =>
  // SAFETY: the hasOwn guard proves `category` keys LEAF_PRIORITY
  Object.hasOwn(LEAF_PRIORITY, category)
    ? LEAF_PRIORITY[category as keyof typeof LEAF_PRIORITY]
    : GROUP_PRIORITY[CATEGORY_GROUP_OF[category]];

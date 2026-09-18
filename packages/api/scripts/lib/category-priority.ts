import { CATEGORY_GROUP_OF } from "../../src/lib/taxonomy";
import type { CategoryGroup, SpendingCategory } from "../../src/lib/taxonomy";

const PRIORITY_LADDER = [
  "no-standalone-intent",
  "bolted-on-forecourt",
  "bolted-on-aisle",
  "leisure",
  "financial",
  "education",
  "travel",
  "eating-out",
  "utilities",
  "health",
  "everyday-essentials",
] as const;

type PriorityRung = (typeof PRIORITY_LADDER)[number];

const rung = (name: PriorityRung): number => PRIORITY_LADDER.indexOf(name);

const GROUP_PRIORITY = {
  "daily-living": rung("everyday-essentials"),
  education: rung("education"),
  financial: rung("financial"),
  health: rung("health"),
  housing: rung("no-standalone-intent"),
  income: rung("no-standalone-intent"),
  investments: rung("no-standalone-intent"),
  leisure: rung("leisure"),
  other: rung("no-standalone-intent"),
  shopping: rung("bolted-on-aisle"),
  subscriptions: rung("no-standalone-intent"),
  taxes: rung("no-standalone-intent"),
  transfers: rung("no-standalone-intent"),
  transport: rung("bolted-on-forecourt"),
  travel: rung("travel"),
  utilities: rung("utilities"),
} as const satisfies Record<CategoryGroup, number>;

const LEAF_PRIORITY_OVERRIDE = {
  "bars-cafes": rung("eating-out"),
  "home-maintenance": rung("bolted-on-aisle"),
  "household-supplies": rung("bolted-on-aisle"),
  "personal-care": rung("bolted-on-aisle"),
  pets: rung("bolted-on-aisle"),
  restaurants: rung("eating-out"),
  takeaway: rung("eating-out"),
} as const satisfies Partial<Record<SpendingCategory, number>>;

export const categoryPriority = (category: SpendingCategory): number =>
  // SAFETY: the hasOwn guard proves `category` keys LEAF_PRIORITY_OVERRIDE
  Object.hasOwn(LEAF_PRIORITY_OVERRIDE, category)
    ? LEAF_PRIORITY_OVERRIDE[category as keyof typeof LEAF_PRIORITY_OVERRIDE]
    : GROUP_PRIORITY[CATEGORY_GROUP_OF[category]];

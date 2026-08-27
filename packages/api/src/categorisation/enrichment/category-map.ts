import type { SpendingCategory } from "../../lib/mcc-categories";

const LOGO_DEV_TO_CATEGORY: Record<string, SpendingCategory> = {
  education: "education",
  entertainment: "entertainment",
  "financial services": "transfers",
  "food & drink": "dining",
  government: "taxes",
  groceries: "groceries",
  "health & fitness": "health",
  home: "housing",
  insurance: "insurance",
  shopping: "shopping",
  subscriptions: "subscriptions",
  transportation: "transport",
  travel: "travel",
  utilities: "utilities",
};

/** Map a Logo.dev category string to a `SpendingCategory`. Case-insensitive. */
export const mapEnrichmentCategory = (
  logoDevCategory: string
): SpendingCategory | null =>
  LOGO_DEV_TO_CATEGORY[logoDevCategory.toLowerCase()] ?? null;

import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "./mcc-categories";
import type { CategoryColor, SpendingCategory } from "./mcc-categories";

export const CATEGORY_COLOR_VALUES = [
  "blue",
  "green",
  "grey",
  "orange",
  "pink",
  "purple",
  "red",
] as const satisfies readonly CategoryColor[];

/** Phosphor icon exports a category may use; the web name→component map covers exactly these. */
export const CATEGORY_ICON_NAMES = [
  "AirplaneIcon",
  "ArrowsLeftRightIcon",
  "BankIcon",
  "CarIcon",
  "DotsThreeIcon",
  "FilmSlateIcon",
  "FirstAidIcon",
  "ForkKnifeIcon",
  "GraduationCapIcon",
  "HouseIcon",
  "LightningIcon",
  "PiggyBankIcon",
  "ReceiptIcon",
  "RepeatIcon",
  "ShieldCheckIcon",
  "ShoppingBagIcon",
  "StorefrontIcon",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

export const PREDEFINED_CATEGORY_ICONS = {
  dining: "ForkKnifeIcon",
  education: "GraduationCapIcon",
  entertainment: "FilmSlateIcon",
  groceries: "StorefrontIcon",
  health: "FirstAidIcon",
  housing: "HouseIcon",
  income: "BankIcon",
  insurance: "ShieldCheckIcon",
  other: "DotsThreeIcon",
  savings: "PiggyBankIcon",
  shopping: "ShoppingBagIcon",
  subscriptions: "RepeatIcon",
  taxes: "ReceiptIcon",
  transfers: "ArrowsLeftRightIcon",
  transport: "CarIcon",
  travel: "AirplaneIcon",
  utilities: "LightningIcon",
} as const satisfies Record<SpendingCategory, CategoryIconName>;

export const CUSTOM_CATEGORY_PREFIX = "custom:";

/** A category as the UI consumes it: predefined slugs and custom ids share one key space. */
export interface CategoryEntry {
  color: CategoryColor;
  icon: CategoryIconName;
  isCustom: boolean;
  /** Predefined slug, or `custom:<cuid>`. */
  key: string;
  label: string;
  /** Predefined slug this entry nests under; null for predefined and top-level custom entries. */
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

  const slug = SPENDING_CATEGORIES.find((candidate) => candidate === key);
  return slug ? { customId: null, slug } : null;
};

/** Everything needed to render a category's glyph, whether predefined or custom. */
export interface CategoryAppearance {
  color: CategoryColor;
  icon: CategoryIconName;
}

export const predefinedCategoryAppearance = (
  category: SpendingCategory
): CategoryAppearance => ({
  color: CATEGORY_COLORS[category],
  icon: PREDEFINED_CATEGORY_ICONS[category],
});

export const predefinedCategoryEntries = (): CategoryEntry[] =>
  SPENDING_CATEGORIES.map((slug) => ({
    color: CATEGORY_COLORS[slug],
    icon: PREDEFINED_CATEGORY_ICONS[slug],
    isCustom: false,
    key: slug,
    label: CATEGORY_LABELS[slug],
    parentKey: null,
    usageCount: 0,
  }));

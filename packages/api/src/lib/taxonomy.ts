/**
 * The one category hierarchy: a category group holds spending categories, and
 * nothing nests deeper. Categorisation resolves a transaction to a category,
 * budgeting assigns a category to a line, and the Sankey draws revenues →
 * groups → categories — all three read this file so they cannot disagree.
 *
 * `SpendingCategory` covers income too: money coming in needs the same
 * vocabulary as money going out for a cash flow to balance.
 */

export const CATEGORY_COLOR_VALUES = [
  "blue",
  "green",
  "grey",
  "orange",
  "pink",
  "purple",
  "red",
] as const;

export type CategoryColor = (typeof CATEGORY_COLOR_VALUES)[number];

/** Stable icon names a category may use; the web name→component map covers exactly these. */
export const CATEGORY_ICON_NAMES = [
  "AirplaneIcon",
  "ArrowsLeftRightIcon",
  "BankIcon",
  "CarIcon",
  "CoinsIcon",
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

/**
 * Groups in flow order: income first because it is the Sankey's left column,
 * then the allocation groups in the order a budget is usually declared.
 */
export const CATEGORY_GROUPS = [
  "income",
  "investments",
  "housing",
  "utilities",
  "daily-living",
  "transport",
  "travel",
  "leisure",
  "shopping",
  "subscriptions",
  "health",
  "education",
  "financial",
  "taxes",
  "transfers",
  "other",
] as const;

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

/** Categories in group order, so a picker can render this list top to bottom. */
export const SPENDING_CATEGORIES = [
  // income
  "salary",
  "self-employment",
  "benefits",
  "investment-income",
  "rental-income",
  "refunds",
  "other-income",
  // investments
  "savings",
  "securities",
  "retirement",
  "life-insurance",
  "crypto",
  "other-investment",
  // housing
  "rent",
  "mortgage",
  "home-charges",
  "home-maintenance",
  "home-insurance",
  "other-housing",
  // utilities
  "energy",
  "water",
  "telecom",
  "other-utilities",
  // daily-living
  "groceries",
  "restaurants",
  "takeaway",
  "bars-cafes",
  "personal-care",
  "household-supplies",
  "pets",
  "childcare",
  "other-daily-living",
  // transport
  "fuel",
  "public-transport",
  "taxi",
  "vehicle-maintenance",
  "vehicle-insurance",
  "parking-tolls",
  "other-transport",
  // travel
  "flights",
  "accommodation",
  "other-travel",
  // leisure
  "culture",
  "sports",
  "hobbies",
  "other-leisure",
  // shopping
  "clothing",
  "electronics",
  "furniture",
  "gifts",
  "other-shopping",
  // subscriptions
  "streaming",
  "software",
  "memberships",
  "other-subscription",
  // health
  "medical",
  "pharmacy",
  "health-insurance",
  "other-health",
  // education
  "tuition",
  "courses",
  "other-education",
  // financial
  "bank-fees",
  "loan-repayment",
  "other-insurance",
  "child-support",
  "other-financial",
  // taxes
  "income-tax",
  "property-tax",
  "other-taxes",
  // transfers
  "internal-transfer",
  "cash-withdrawal",
  "other-transfer",
  // other
  "donations",
  "uncategorised",
] as const;

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];

export const CATEGORY_GROUP_LABELS = {
  "daily-living": "Daily living",
  education: "Education",
  financial: "Financial",
  health: "Health",
  housing: "Housing",
  income: "Income",
  investments: "Investments",
  leisure: "Leisure",
  other: "Other",
  shopping: "Shopping",
  subscriptions: "Subscriptions",
  taxes: "Taxes",
  transfers: "Transfers",
  transport: "Transport",
  travel: "Travel",
  utilities: "Utilities",
} as const satisfies Record<CategoryGroup, string>;

export const CATEGORY_GROUP_COLORS = {
  "daily-living": "green",
  education: "orange",
  financial: "grey",
  health: "red",
  housing: "purple",
  income: "green",
  investments: "green",
  leisure: "pink",
  other: "grey",
  shopping: "purple",
  subscriptions: "pink",
  taxes: "red",
  transfers: "grey",
  transport: "blue",
  travel: "blue",
  utilities: "orange",
} as const satisfies Record<CategoryGroup, CategoryColor>;

export const CATEGORY_GROUP_ICONS = {
  "daily-living": "StorefrontIcon",
  education: "GraduationCapIcon",
  financial: "CoinsIcon",
  health: "FirstAidIcon",
  housing: "HouseIcon",
  income: "BankIcon",
  investments: "PiggyBankIcon",
  leisure: "FilmSlateIcon",
  other: "DotsThreeIcon",
  shopping: "ShoppingBagIcon",
  subscriptions: "RepeatIcon",
  taxes: "ReceiptIcon",
  transfers: "ArrowsLeftRightIcon",
  transport: "CarIcon",
  travel: "AirplaneIcon",
  utilities: "LightningIcon",
} as const satisfies Record<CategoryGroup, CategoryIconName>;

export const CATEGORY_GROUP_OF = {
  accommodation: "travel",
  "bank-fees": "financial",
  "bars-cafes": "daily-living",
  benefits: "income",
  "cash-withdrawal": "transfers",
  "child-support": "financial",
  childcare: "daily-living",
  clothing: "shopping",
  courses: "education",
  crypto: "investments",
  culture: "leisure",
  donations: "other",
  electronics: "shopping",
  energy: "utilities",
  flights: "travel",
  fuel: "transport",
  furniture: "shopping",
  gifts: "shopping",
  groceries: "daily-living",
  "health-insurance": "health",
  hobbies: "leisure",
  "home-charges": "housing",
  "home-insurance": "housing",
  "home-maintenance": "housing",
  "household-supplies": "daily-living",
  "income-tax": "taxes",
  "internal-transfer": "transfers",
  "investment-income": "income",
  "life-insurance": "investments",
  "loan-repayment": "financial",
  medical: "health",
  memberships: "subscriptions",
  mortgage: "housing",
  "other-daily-living": "daily-living",
  "other-education": "education",
  "other-financial": "financial",
  "other-health": "health",
  "other-housing": "housing",
  "other-income": "income",
  "other-insurance": "financial",
  "other-investment": "investments",
  "other-leisure": "leisure",
  "other-shopping": "shopping",
  "other-subscription": "subscriptions",
  "other-taxes": "taxes",
  "other-transfer": "transfers",
  "other-transport": "transport",
  "other-travel": "travel",
  "other-utilities": "utilities",
  "parking-tolls": "transport",
  "personal-care": "daily-living",
  pets: "daily-living",
  pharmacy: "health",
  "property-tax": "taxes",
  "public-transport": "transport",
  refunds: "income",
  rent: "housing",
  "rental-income": "income",
  restaurants: "daily-living",
  retirement: "investments",
  salary: "income",
  savings: "investments",
  securities: "investments",
  "self-employment": "income",
  software: "subscriptions",
  sports: "leisure",
  streaming: "subscriptions",
  takeaway: "daily-living",
  taxi: "transport",
  telecom: "utilities",
  tuition: "education",
  uncategorised: "other",
  "vehicle-insurance": "transport",
  "vehicle-maintenance": "transport",
  water: "utilities",
} as const satisfies Record<SpendingCategory, CategoryGroup>;

export const CATEGORY_LABELS = {
  accommodation: "Accommodation",
  "bank-fees": "Bank fees",
  "bars-cafes": "Bars & cafés",
  benefits: "Benefits & allowances",
  "cash-withdrawal": "Cash withdrawal",
  "child-support": "Child support",
  childcare: "Childcare",
  clothing: "Clothing",
  courses: "Courses & training",
  crypto: "Crypto",
  culture: "Culture & events",
  donations: "Donations",
  electronics: "Electronics",
  energy: "Energy",
  flights: "Flights",
  fuel: "Fuel & charging",
  furniture: "Furniture & decor",
  gifts: "Gifts",
  groceries: "Groceries",
  "health-insurance": "Health insurance",
  hobbies: "Hobbies & games",
  "home-charges": "Home charges",
  "home-insurance": "Home insurance",
  "home-maintenance": "Home maintenance",
  "household-supplies": "Household supplies",
  "income-tax": "Income tax",
  "internal-transfer": "Internal transfer",
  "investment-income": "Investment income",
  "life-insurance": "Life insurance",
  "loan-repayment": "Loan repayment",
  medical: "Medical care",
  memberships: "Memberships",
  mortgage: "Mortgage",
  "other-daily-living": "Other daily living",
  "other-education": "Other education",
  "other-financial": "Other financial",
  "other-health": "Other health",
  "other-housing": "Other housing",
  "other-income": "Other income",
  "other-insurance": "Other insurance",
  "other-investment": "Other investment",
  "other-leisure": "Other leisure",
  "other-shopping": "Other shopping",
  "other-subscription": "Other subscription",
  "other-taxes": "Other taxes",
  "other-transfer": "Other transfer",
  "other-transport": "Other transport",
  "other-travel": "Other travel",
  "other-utilities": "Other utilities",
  "parking-tolls": "Parking & tolls",
  "personal-care": "Personal care",
  pets: "Pets",
  pharmacy: "Pharmacy",
  "property-tax": "Property tax",
  "public-transport": "Public transport",
  refunds: "Refunds",
  rent: "Rent",
  "rental-income": "Rental income",
  restaurants: "Restaurants",
  retirement: "Retirement",
  salary: "Salary",
  savings: "Savings",
  securities: "Securities",
  "self-employment": "Self-employment",
  software: "Software & apps",
  sports: "Sports & fitness",
  streaming: "Streaming & media",
  takeaway: "Takeaway & delivery",
  taxi: "Taxi & rideshare",
  telecom: "Internet & mobile",
  tuition: "Tuition & fees",
  uncategorised: "Uncategorised",
  "vehicle-insurance": "Vehicle insurance",
  "vehicle-maintenance": "Vehicle maintenance",
  water: "Water",
} as const satisfies Record<SpendingCategory, string>;

/**
 * Where a group's flow lands when a signal identifies the group but not the
 * category — a NAF division, a deleted custom category, a legacy slug.
 */
export const CATEGORY_GROUP_FALLBACKS = {
  "daily-living": "other-daily-living",
  education: "other-education",
  financial: "other-financial",
  health: "other-health",
  housing: "other-housing",
  income: "other-income",
  investments: "other-investment",
  leisure: "other-leisure",
  other: "uncategorised",
  shopping: "other-shopping",
  subscriptions: "other-subscription",
  taxes: "other-taxes",
  transfers: "other-transfer",
  transport: "other-transport",
  travel: "other-travel",
  utilities: "other-utilities",
} as const satisfies Record<CategoryGroup, SpendingCategory>;

/**
 * The flat category set that preceded the hierarchy, kept so the migration and
 * anything decoding a pre-hierarchy value agree. A broad old slug becomes its
 * group's fallback, since it never carried more precision than the group —
 * `dining` covered restaurants, bars and fast food alike, so it cannot claim
 * any one of them. Only `groceries` and `savings` survive one-to-one.
 */
export const LEGACY_CATEGORY_SLUGS = {
  dining: "other-daily-living",
  education: "other-education",
  entertainment: "other-leisure",
  groceries: "groceries",
  health: "other-health",
  housing: "other-housing",
  income: "other-income",
  insurance: "other-insurance",
  other: "uncategorised",
  savings: "savings",
  shopping: "other-shopping",
  subscriptions: "other-subscription",
  taxes: "other-taxes",
  transfers: "other-transfer",
  transport: "other-transport",
  travel: "other-travel",
  utilities: "other-utilities",
} as const satisfies Record<string, SpendingCategory>;

// CATEGORY_LABELS and CATEGORY_GROUP_LABELS are keyed by exactly their unions,
// so their own keys are the authoritative membership test.
export const isSpendingCategory = (value: string): value is SpendingCategory =>
  Object.hasOwn(CATEGORY_LABELS, value);

export const isCategoryGroup = (value: string): value is CategoryGroup =>
  Object.hasOwn(CATEGORY_GROUP_LABELS, value);

const categoriesByGroup = new Map<CategoryGroup, SpendingCategory[]>(
  CATEGORY_GROUPS.map((group) => [group, []])
);
for (const category of SPENDING_CATEGORIES) {
  categoriesByGroup.get(CATEGORY_GROUP_OF[category])?.push(category);
}

/** A group's categories, in `SPENDING_CATEGORIES` order. */
export const categoriesInGroup = (
  group: CategoryGroup
): readonly SpendingCategory[] => categoriesByGroup.get(group) ?? [];

/** A category's color and icon are its group's — only groups carry appearance. */
export const categoryColor = (category: SpendingCategory): CategoryColor =>
  CATEGORY_GROUP_COLORS[CATEGORY_GROUP_OF[category]];

export const categoryIcon = (category: SpendingCategory): CategoryIconName =>
  CATEGORY_GROUP_ICONS[CATEGORY_GROUP_OF[category]];

/** Current slug for a stored one, accepting both current and legacy spellings. */
export const resolveCategorySlug = (value: string): SpendingCategory | null => {
  if (isSpendingCategory(value)) {
    return value;
  }
  // SAFETY: the hasOwn guard proves `value` keys LEGACY_CATEGORY_SLUGS
  return Object.hasOwn(LEGACY_CATEGORY_SLUGS, value)
    ? LEGACY_CATEGORY_SLUGS[value as keyof typeof LEGACY_CATEGORY_SLUGS]
    : null;
};

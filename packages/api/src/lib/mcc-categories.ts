import {
  allBankCodeKeywords,
  allCounterpartyKeywords,
} from "../categorisation/keywords";

export type SpendingCategory =
  | "dining"
  | "education"
  | "entertainment"
  | "groceries"
  | "health"
  | "housing"
  | "income"
  | "insurance"
  | "other"
  | "savings"
  | "shopping"
  | "subscriptions"
  | "taxes"
  | "transfers"
  | "transport"
  | "travel"
  | "utilities";

export const SPENDING_CATEGORIES = [
  "dining",
  "education",
  "entertainment",
  "groceries",
  "health",
  "housing",
  "income",
  "insurance",
  "other",
  "savings",
  "shopping",
  "subscriptions",
  "taxes",
  "transfers",
  "transport",
  "travel",
  "utilities",
] as const satisfies readonly SpendingCategory[];

export type CategoryColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "grey";

export const CATEGORY_LABELS = {
  dining: "Dining",
  education: "Education",
  entertainment: "Entertainment",
  groceries: "Groceries",
  health: "Health",
  housing: "Housing",
  income: "Income",
  insurance: "Insurance",
  other: "Other",
  savings: "Savings",
  shopping: "Shopping",
  subscriptions: "Subscriptions",
  taxes: "Taxes",
  transfers: "Transfers",
  transport: "Transport",
  travel: "Travel",
  utilities: "Utilities",
} as const satisfies Record<SpendingCategory, string>;

// CATEGORY_LABELS is keyed by exactly the SpendingCategory union, so its own
// keys are the authoritative membership test.
const isSpendingCategory = (value: string): value is SpendingCategory =>
  Object.hasOwn(CATEGORY_LABELS, value);

export const CATEGORY_COLORS = {
  dining: "orange",
  education: "orange",
  entertainment: "pink",
  groceries: "green",
  health: "red",
  housing: "purple",
  income: "green",
  insurance: "grey",
  other: "grey",
  savings: "green",
  shopping: "purple",
  subscriptions: "pink",
  taxes: "red",
  transfers: "grey",
  transport: "blue",
  travel: "blue",
  utilities: "grey",
} as const satisfies Record<SpendingCategory, CategoryColor>;

// MCC → SpendingCategory flat lookup (keys sorted lexicographically)

const MCC_TO_CATEGORY = {
  "1520": "housing",
  "1711": "housing",
  "1731": "housing",
  "1740": "housing",
  "1750": "housing",
  "1761": "housing",
  "1771": "housing",
  "1799": "housing",
  "4011": "transport",
  "4111": "transport",
  "4112": "transport",
  "4121": "transport",
  "4131": "transport",
  "4411": "travel",
  "4457": "travel",
  "4468": "travel",
  "4511": "travel",
  "4582": "travel",
  "4722": "travel",
  "4723": "travel",
  "4784": "transport",
  "4812": "utilities",
  "4813": "utilities",
  "4814": "utilities",
  "4815": "subscriptions",
  "4816": "utilities",
  "4821": "utilities",
  "4829": "transfers",
  "4899": "utilities",
  "4900": "utilities",
  "5013": "transport",
  "5021": "housing",
  "5039": "housing",
  "5046": "housing",
  "5047": "health",
  "5065": "housing",
  "5072": "housing",
  "5074": "housing",
  "5085": "housing",
  "5111": "shopping",
  "5122": "health",
  "5131": "shopping",
  "5137": "shopping",
  "5139": "shopping",
  "5169": "shopping",
  "5172": "shopping",
  "5192": "shopping",
  "5193": "shopping",
  "5194": "shopping",
  "5198": "housing",
  "5199": "shopping",
  "5200": "housing",
  "5211": "housing",
  "5231": "housing",
  "5251": "housing",
  "5261": "housing",
  "5292": "health",
  "5300": "shopping",
  "5309": "shopping",
  "5310": "shopping",
  "5311": "shopping",
  "5331": "shopping",
  "5399": "shopping",
  "5411": "groceries",
  "5422": "groceries",
  "5441": "groceries",
  "5451": "groceries",
  "5462": "groceries",
  "5499": "groceries",
  "5511": "transport",
  "5521": "transport",
  "5531": "transport",
  "5532": "transport",
  "5533": "transport",
  "5541": "transport",
  "5542": "transport",
  "5571": "transport",
  "5592": "transport",
  "5599": "transport",
  "5611": "shopping",
  "5621": "shopping",
  "5631": "shopping",
  "5641": "shopping",
  "5651": "shopping",
  "5655": "shopping",
  "5661": "shopping",
  "5681": "shopping",
  "5691": "shopping",
  "5697": "shopping",
  "5698": "shopping",
  "5699": "shopping",
  "5712": "housing",
  "5713": "housing",
  "5714": "housing",
  "5718": "housing",
  "5719": "housing",
  "5722": "housing",
  "5733": "entertainment",
  "5735": "entertainment",
  "5811": "dining",
  "5812": "dining",
  "5813": "dining",
  "5814": "dining",
  "5815": "subscriptions",
  "5816": "entertainment",
  "5817": "subscriptions",
  "5818": "entertainment",
  "5912": "health",
  "5931": "shopping",
  "5932": "shopping",
  "5933": "shopping",
  "5935": "shopping",
  "5937": "shopping",
  "5940": "shopping",
  "5941": "shopping",
  "5942": "shopping",
  "5943": "shopping",
  "5944": "shopping",
  "5945": "shopping",
  "5946": "shopping",
  "5947": "shopping",
  "5948": "shopping",
  "5949": "shopping",
  "5950": "shopping",
  "5960": "insurance",
  "5966": "subscriptions",
  "5967": "subscriptions",
  "5968": "subscriptions",
  "5970": "shopping",
  "5971": "shopping",
  "5975": "health",
  "5976": "health",
  "5977": "shopping",
  "5978": "shopping",
  "5983": "shopping",
  "5992": "shopping",
  "5993": "shopping",
  "5994": "shopping",
  "5995": "shopping",
  "5996": "shopping",
  "5997": "shopping",
  "5998": "shopping",
  "5999": "shopping",
  "6010": "transfers",
  "6011": "transfers",
  "6012": "transfers",
  "6050": "transfers",
  "6051": "transfers",
  "6211": "transfers",
  "6300": "insurance",
  "6381": "insurance",
  "6399": "insurance",
  "6513": "transfers",
  "7011": "travel",
  "7012": "travel",
  "7032": "travel",
  "7033": "travel",
  "7511": "transport",
  "7512": "transport",
  "7513": "transport",
  "7519": "transport",
  "7523": "transport",
  "7524": "transport",
  "7531": "transport",
  "7534": "transport",
  "7535": "transport",
  "7538": "transport",
  "7542": "transport",
  "7549": "transport",
  "7622": "housing",
  "7623": "housing",
  "7629": "housing",
  "7641": "housing",
  "7692": "housing",
  "7699": "housing",
  "7800": "entertainment",
  "7801": "entertainment",
  "7802": "entertainment",
  "7829": "entertainment",
  "7832": "entertainment",
  "7841": "entertainment",
  "7911": "entertainment",
  "7922": "entertainment",
  "7929": "entertainment",
  "7932": "entertainment",
  "7933": "entertainment",
  "7941": "entertainment",
  "7991": "entertainment",
  "7992": "entertainment",
  "7993": "entertainment",
  "7994": "entertainment",
  "7995": "entertainment",
  "7996": "entertainment",
  "7997": "entertainment",
  "7998": "entertainment",
  "7999": "entertainment",
  "8011": "health",
  "8021": "health",
  "8031": "health",
  "8041": "health",
  "8042": "health",
  "8043": "health",
  "8049": "health",
  "8050": "health",
  "8062": "health",
  "8071": "health",
  "8082": "health",
  "8099": "health",
  "8211": "education",
  "8220": "education",
  "8241": "education",
  "8244": "education",
  "8249": "education",
  "8299": "education",
  "8351": "education",
  "9211": "taxes",
  "9222": "taxes",
  "9311": "taxes",
  "9399": "taxes",
  "9402": "taxes",
  "9405": "taxes",
} as const satisfies Record<string, SpendingCategory>;

export { MCC_TO_CATEGORY };

// MCC code → category (range checks first, then flat lookup)

const mccToCategory = (code: string): SpendingCategory => {
  const n = Math.trunc(Number(code));
  if (!Number.isNaN(n)) {
    if (n >= 3000 && n <= 3350) {
      return "travel";
    }
    if (n >= 3351 && n <= 3999) {
      return "travel";
    }
  }
  // SAFETY: code is always a string key from the EB API; the assertion narrows for const lookup
  return MCC_TO_CATEGORY[code as keyof typeof MCC_TO_CATEGORY] ?? "other";
};

// Keyword heuristic tables for deriveCategory

const BANK_CODE_KEYWORDS: [RegExp, SpendingCategory][] = [
  [/lön|salary|wage/u, "income"],
  [/hyra|rent|mortgage/u, "housing"],
  [/försäkring|insurance/u, "insurance"],
  [/skatt|tax/u, "taxes"],
  [/överföring|transfer|utlandsbetalning|foreign/u, "transfers"],
];

const COUNTERPARTY_KEYWORDS: [RegExp, SpendingCategory][] = [
  [/uber|lyft|bolt|taxi|cabify/u, "transport"],
  [
    /netflix|spotify|disney|hbo|youtube|apple\.com|google play/u,
    "subscriptions",
  ],
  [/amazon|ebay|zalando|asos|h&m|zara/u, "shopping"],
  [/mcdonald|burger king|starbucks|subway|domino/u, "dining"],
  [
    /lidl|aldi|ica|coop|carrefour|tesco|walmart|target|albert heijn|migros/u,
    "groceries",
  ],
  [/booking\.com|airbnb|expedia|ryanair|easyjet|sas|klm|lufthansa/u, "travel"],
  [/apotek|pharmacy|apotheke/u, "health"],
];

// Derive category from transaction data
// Cascade: MCC → income-by-sign → bank code keywords → counterparty → "other"

export const deriveCategory = (tx: {
  resolvedCategory?: string | null;
  merchantCategoryCode?: string | null;
  bankTransactionCode?: string | null;
  counterpartyName?: string | null;
  amount: number;
}): SpendingCategory => {
  if (tx.resolvedCategory && isSpendingCategory(tx.resolvedCategory)) {
    return tx.resolvedCategory;
  }

  // 1. MCC lookup
  if (tx.merchantCategoryCode) {
    const cat = mccToCategory(tx.merchantCategoryCode);
    if (cat !== "other") {
      return cat;
    }
  }

  // 2. Positive amount with no matching MCC → income
  if (tx.amount > 0) {
    return "income";
  }

  // 3. Bank transaction code keyword heuristics
  if (tx.bankTransactionCode) {
    const desc = tx.bankTransactionCode.toLowerCase();
    for (const [pattern, category] of BANK_CODE_KEYWORDS) {
      if (pattern.test(desc)) {
        return category;
      }
    }
    for (const [pattern, category] of allBankCodeKeywords) {
      if (pattern.test(desc)) {
        return category;
      }
    }
  }

  // 4. Counterparty name heuristics
  if (tx.counterpartyName) {
    const name = tx.counterpartyName.toLowerCase();
    for (const [pattern, category] of COUNTERPARTY_KEYWORDS) {
      if (pattern.test(name)) {
        return category;
      }
    }
    for (const [pattern, category] of allCounterpartyKeywords) {
      if (pattern.test(name)) {
        return category;
      }
    }
  }

  return "other";
};

/**
 * The single source of truth for a transaction's category.
 * Returns the user override when set, otherwise the auto-derived category.
 */
export const effectiveCategory = (tx: {
  category?: string | null;
  resolvedCategory?: string | null;
  merchantCategoryCode?: string | null;
  bankTransactionCode?: string | null;
  counterpartyName?: string | null;
  amount: number;
}): SpendingCategory =>
  // SAFETY: category column is only written with validated SpendingCategory values or null
  (tx.category as SpendingCategory | null) ?? deriveCategory(tx);

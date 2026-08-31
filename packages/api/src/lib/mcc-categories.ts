import {
  allBankCodeKeywords,
  allCounterpartyKeywords,
} from "../categorisation/keywords";
import { CATEGORY_GROUP_OF, resolveCategorySlug } from "./taxonomy";
import type { SpendingCategory } from "./taxonomy";

// MCC → SpendingCategory flat lookup (keys sorted lexicographically)

const MCC_TO_CATEGORY = {
  "1520": "home-maintenance",
  "1711": "home-maintenance",
  "1731": "home-maintenance",
  "1740": "home-maintenance",
  "1750": "home-maintenance",
  "1761": "home-maintenance",
  "1771": "home-maintenance",
  "1799": "home-maintenance",
  // Freight rail, unlike 4112 passenger railways.
  "4011": "other-transport",
  "4111": "public-transport",
  "4112": "public-transport",
  "4121": "taxi",
  "4131": "public-transport",
  "4411": "other-travel",
  "4457": "other-travel",
  "4468": "other-travel",
  "4511": "flights",
  // Airport and terminal charges, not the ticket.
  "4582": "other-travel",
  "4722": "other-travel",
  "4723": "other-travel",
  "4784": "parking-tolls",
  "4812": "electronics",
  "4813": "telecom",
  "4814": "telecom",
  "4815": "telecom",
  "4816": "telecom",
  "4821": "telecom",
  "4829": "other-transfer",
  "4899": "streaming",
  "4900": "energy",
  "5013": "vehicle-maintenance",
  "5021": "furniture",
  "5039": "home-maintenance",
  "5046": "other-shopping",
  "5047": "medical",
  "5065": "home-maintenance",
  "5072": "home-maintenance",
  "5074": "home-maintenance",
  "5085": "other-shopping",
  "5111": "other-shopping",
  "5122": "pharmacy",
  "5131": "clothing",
  "5137": "clothing",
  "5139": "clothing",
  "5169": "other-shopping",
  "5172": "fuel",
  "5192": "hobbies",
  "5193": "home-maintenance",
  "5194": "other-shopping",
  "5198": "home-maintenance",
  "5199": "other-shopping",
  "5200": "home-maintenance",
  "5211": "home-maintenance",
  "5231": "home-maintenance",
  "5251": "home-maintenance",
  "5261": "home-maintenance",
  "5292": "other-health",
  "5300": "other-shopping",
  "5309": "other-shopping",
  "5310": "other-shopping",
  "5311": "other-shopping",
  "5331": "other-shopping",
  "5399": "other-shopping",
  "5411": "groceries",
  "5422": "groceries",
  "5441": "groceries",
  "5451": "groceries",
  "5462": "groceries",
  "5499": "groceries",
  // Vehicle dealers: a purchase, not upkeep, and the group has no leaf for it.
  "5511": "other-transport",
  "5521": "other-transport",
  "5531": "vehicle-maintenance",
  "5532": "vehicle-maintenance",
  "5533": "vehicle-maintenance",
  "5541": "fuel",
  "5542": "fuel",
  "5571": "other-transport",
  "5592": "other-transport",
  "5599": "other-transport",
  "5611": "clothing",
  "5621": "clothing",
  "5631": "clothing",
  "5641": "clothing",
  "5651": "clothing",
  "5655": "clothing",
  "5661": "clothing",
  "5681": "clothing",
  "5691": "clothing",
  "5697": "clothing",
  "5698": "personal-care",
  "5699": "clothing",
  "5712": "furniture",
  "5713": "furniture",
  "5714": "furniture",
  "5718": "furniture",
  "5719": "furniture",
  "5722": "furniture",
  "5733": "hobbies",
  "5735": "hobbies",
  "5811": "restaurants",
  "5812": "restaurants",
  "5813": "bars-cafes",
  "5814": "takeaway",
  "5815": "streaming",
  "5816": "hobbies",
  "5817": "software",
  // Large digital-goods merchant: spans media, apps and games alike.
  "5818": "other-subscription",
  "5912": "pharmacy",
  "5931": "other-shopping",
  "5932": "other-shopping",
  "5933": "other-shopping",
  "5935": "other-shopping",
  "5937": "other-shopping",
  "5940": "sports",
  "5941": "sports",
  "5942": "hobbies",
  "5943": "other-shopping",
  "5944": "other-shopping",
  "5945": "hobbies",
  "5946": "electronics",
  "5947": "gifts",
  "5948": "other-shopping",
  "5949": "hobbies",
  "5950": "furniture",
  "5960": "other-insurance",
  "5966": "other-subscription",
  "5967": "other-subscription",
  "5968": "other-subscription",
  "5970": "hobbies",
  "5971": "culture",
  "5975": "medical",
  "5976": "medical",
  "5977": "personal-care",
  "5978": "other-shopping",
  // Fuel dealers deliver heating oil, wood and LPG to the home.
  "5983": "energy",
  "5992": "gifts",
  "5993": "other-daily-living",
  "5994": "hobbies",
  "5995": "pets",
  "5996": "home-maintenance",
  "5997": "personal-care",
  "5998": "other-shopping",
  "5999": "other-shopping",
  // 6010 is a manual cash disbursement — a withdrawal over a counter. 6012 is
  // the bank selling a service, matching NAF 64 and amenity=bank.
  "6010": "cash-withdrawal",
  "6011": "cash-withdrawal",
  "6012": "other-financial",
  "6050": "other-transfer",
  "6051": "other-transfer",
  "6211": "securities",
  "6300": "other-insurance",
  "6381": "other-insurance",
  "6399": "other-insurance",
  "6513": "rent",
  "7011": "accommodation",
  "7012": "accommodation",
  "7032": "other-travel",
  "7033": "accommodation",
  "7511": "fuel",
  "7512": "other-travel",
  "7513": "other-transport",
  "7519": "other-travel",
  "7523": "parking-tolls",
  "7524": "other-transport",
  "7531": "vehicle-maintenance",
  "7534": "vehicle-maintenance",
  "7535": "vehicle-maintenance",
  "7538": "vehicle-maintenance",
  "7542": "vehicle-maintenance",
  "7549": "vehicle-maintenance",
  "7622": "electronics",
  "7623": "home-maintenance",
  "7629": "home-maintenance",
  "7641": "furniture",
  "7692": "home-maintenance",
  "7699": "home-maintenance",
  // Lotteries, licensed online casinos and race betting sit with 7995.
  "7800": "hobbies",
  "7801": "hobbies",
  "7802": "hobbies",
  "7829": "culture",
  "7832": "culture",
  "7841": "culture",
  "7911": "sports",
  "7922": "culture",
  "7929": "culture",
  "7932": "hobbies",
  "7933": "sports",
  "7941": "sports",
  "7991": "culture",
  "7992": "sports",
  "7993": "hobbies",
  "7994": "hobbies",
  "7995": "hobbies",
  "7996": "culture",
  "7997": "sports",
  "7998": "culture",
  "7999": "other-leisure",
  "8011": "medical",
  "8021": "medical",
  "8031": "medical",
  "8041": "medical",
  "8042": "medical",
  "8043": "medical",
  "8049": "medical",
  "8050": "medical",
  "8062": "medical",
  "8071": "medical",
  "8082": "medical",
  "8099": "other-health",
  "8211": "tuition",
  "8220": "tuition",
  "8241": "courses",
  "8244": "courses",
  "8249": "courses",
  "8299": "other-education",
  "8351": "childcare",
  "9211": "child-support",
  "9222": "other-taxes",
  "9311": "income-tax",
  "9399": "other-taxes",
  "9402": "other-daily-living",
  "9405": "other-taxes",
} as const satisfies Record<string, SpendingCategory>;

export { MCC_TO_CATEGORY };

// MCC code → category (range checks first, then flat lookup)

const mccToCategory = (code: string): SpendingCategory => {
  const n = Math.trunc(Number(code));
  if (!Number.isNaN(n)) {
    // The 3xxx block is issuer-assigned per carrier: airlines, then car-rental
    // agencies, then lodging chains.
    if (n >= 3000 && n <= 3299) {
      return "flights";
    }
    if (n >= 3300 && n <= 3499) {
      return "other-travel";
    }
    if (n >= 3500 && n <= 3999) {
      return "accommodation";
    }
  }
  // SAFETY: code is always a string key from the EB API; the assertion narrows for const lookup
  return (
    MCC_TO_CATEGORY[code as keyof typeof MCC_TO_CATEGORY] ?? "uncategorised"
  );
};

// Keyword heuristic tables for deriveCategory

const BANK_CODE_KEYWORDS: [RegExp, SpendingCategory][] = [
  [/lön|salary|wage/u, "salary"],
  [/hyra|rent/u, "rent"],
  [/mortgage/u, "mortgage"],
  [/försäkring|insurance/u, "other-insurance"],
  [/skatt|tax/u, "other-taxes"],
  [/överföring|transfer|utlandsbetalning|foreign/u, "other-transfer"],
];

const COUNTERPARTY_KEYWORDS: [RegExp, SpendingCategory][] = [
  [/uber|lyft|bolt|taxi|cabify/u, "taxi"],
  [/netflix|spotify|disney|hbo|youtube/u, "streaming"],
  [/apple\.com|google play/u, "software"],
  [/amazon|ebay/u, "other-shopping"],
  [/zalando|asos|h&m|zara/u, "clothing"],
  [/mcdonald|burger king|subway|domino/u, "takeaway"],
  [/starbucks/u, "bars-cafes"],
  [
    /lidl|aldi|ica|coop|carrefour|tesco|walmart|target|albert heijn|migros/u,
    "groceries",
  ],
  [/booking\.com|airbnb|expedia/u, "accommodation"],
  [/ryanair|easyjet|sas|klm|lufthansa/u, "flights"],
  [/apotek|pharmacy|apotheke/u, "pharmacy"],
];

// Concatenated once: deriveCategory runs per transaction, so the country tables
// must not be spread on every call.
const ALL_BANK_CODE_KEYWORDS: readonly (readonly [RegExp, SpendingCategory])[] =
  [...BANK_CODE_KEYWORDS, ...allBankCodeKeywords];

const ALL_COUNTERPARTY_KEYWORDS: readonly (readonly [
  RegExp,
  SpendingCategory,
])[] = [...COUNTERPARTY_KEYWORDS, ...allCounterpartyKeywords];

const matchKeyword = (
  table: readonly (readonly [RegExp, SpendingCategory])[],
  text: string
): SpendingCategory | null => {
  for (const [pattern, category] of table) {
    if (pattern.test(text)) {
      return category;
    }
  }
  return null;
};

// Derive category from transaction data
// Cascade: MCC → income-by-sign → bank code keywords → counterparty → "uncategorised"

export const deriveCategory = (tx: {
  resolvedCategory?: string | null;
  merchantCategoryCode?: string | null;
  bankTransactionCode?: string | null;
  counterpartyName?: string | null;
  amount: number;
}): SpendingCategory => {
  const resolved = tx.resolvedCategory
    ? resolveCategorySlug(tx.resolvedCategory)
    : null;
  if (resolved) {
    return resolved;
  }

  // 1. MCC lookup
  if (tx.merchantCategoryCode) {
    const cat = mccToCategory(tx.merchantCategoryCode);
    if (cat !== "uncategorised") {
      return cat;
    }
  }

  // 2. A credit's bank code may still name the income precisely. An expense
  //    keyword on a credit means a refund, not that category, so only an
  //    income-group match wins.
  if (tx.amount > 0) {
    const desc = tx.bankTransactionCode?.toLowerCase();
    const named = desc ? matchKeyword(ALL_BANK_CODE_KEYWORDS, desc) : null;
    return named && CATEGORY_GROUP_OF[named] === "income"
      ? named
      : "other-income";
  }

  // 3. Bank transaction code keyword heuristics
  const bankCode = tx.bankTransactionCode?.toLowerCase();
  const byBankCode = bankCode
    ? matchKeyword(ALL_BANK_CODE_KEYWORDS, bankCode)
    : null;
  if (byBankCode) {
    return byBankCode;
  }

  // 4. Counterparty name heuristics
  const counterparty = tx.counterpartyName?.toLowerCase();
  const byCounterparty = counterparty
    ? matchKeyword(ALL_COUNTERPARTY_KEYWORDS, counterparty)
    : null;
  if (byCounterparty) {
    return byCounterparty;
  }

  return "uncategorised";
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
}): SpendingCategory => {
  // A row written before the hierarchy carries a legacy slug; an unrecognised
  // value is treated as no override at all.
  const override = tx.category ? resolveCategorySlug(tx.category) : null;
  return override ?? deriveCategory(tx);
};

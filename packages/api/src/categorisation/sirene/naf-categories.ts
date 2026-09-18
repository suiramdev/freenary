import type { SpendingCategory } from "../../lib/taxonomy";

type NafCategoryTable = Record<string, SpendingCategory>;

const NAF_DIVISION_WIDTH = 2;
const NAF_GROUP_WIDTH = 4;
const NAF_CLASS_WIDTH = 5;

const NAF_REV2_CLASS_CODE = /^\d{2}\.\d{2}[A-Z]?$/u;

const CATEGORY_BY_NAF_DIVISION = {
  "01": "groceries",
  "02": "uncategorised",
  "03": "groceries",
  "05": "uncategorised",
  "06": "uncategorised",
  "07": "uncategorised",
  "08": "uncategorised",
  "09": "uncategorised",
  "10": "groceries",
  "11": "groceries",
  "12": "groceries",
  "13": "other-shopping",
  "14": "clothing",
  "15": "clothing",
  "16": "other-shopping",
  "17": "other-shopping",
  "18": "other-shopping",
  "19": "energy",
  "20": "uncategorised",
  "21": "other-health",
  "22": "uncategorised",
  "23": "uncategorised",
  "24": "uncategorised",
  "25": "uncategorised",
  "26": "electronics",
  "27": "electronics",
  "28": "uncategorised",
  "29": "uncategorised",
  "30": "uncategorised",
  "31": "furniture",
  "32": "other-shopping",
  "33": "uncategorised",
  "35": "energy",
  "36": "water",
  "37": "water",
  "38": "other-utilities",
  "39": "uncategorised",
  "41": "home-maintenance",
  "42": "home-maintenance",
  "43": "home-maintenance",
  "45": "other-transport",
  "46": "other-shopping",
  "47": "other-shopping",
  "49": "other-transport",
  "50": "other-travel",
  "51": "flights",
  "52": "other-transport",
  "53": "uncategorised",
  "55": "accommodation",
  "56": "other-daily-living",
  "58": "other-leisure",
  "59": "culture",
  "60": "streaming",
  "61": "telecom",
  "62": "software",
  "63": "software",
  "64": "other-financial",
  "65": "other-insurance",
  "66": "other-financial",
  "68": "other-housing",
  "69": "uncategorised",
  "70": "uncategorised",
  "71": "uncategorised",
  "72": "uncategorised",
  "73": "uncategorised",
  "74": "uncategorised",
  "75": "pets",
  "77": "other-shopping",
  "78": "uncategorised",
  "79": "other-travel",
  "80": "uncategorised",
  "81": "home-maintenance",
  "82": "uncategorised",
  "84": "other-taxes",
  "85": "other-education",
  "86": "medical",
  "87": "other-health",
  "88": "other-health",
  "90": "culture",
  "91": "culture",
  "92": "hobbies",
  "93": "sports",
  "94": "memberships",
  "95": "other-shopping",
  "96": "personal-care",
} satisfies NafCategoryTable;

const CATEGORY_BY_NAF_GROUP = {
  "47.2": "groceries",
} satisfies NafCategoryTable;

const CATEGORY_BY_NAF_CLASS = {
  "47.11": "groceries",
  "47.21": "groceries",
  "47.22": "groceries",
  "47.23": "groceries",
  "47.24": "groceries",
  "47.25": "groceries",
  "47.26": "groceries",
  "47.29": "groceries",
  "47.30": "fuel",
  "47.52": "home-maintenance",
  "47.61": "hobbies",
  "47.63": "hobbies",
  "47.64": "sports",
  "47.65": "hobbies",
  "47.73": "pharmacy",
  "47.74": "medical",
  "47.75": "personal-care",
  "49.10": "public-transport",
  "49.31": "public-transport",
  "49.32": "taxi",
  "56.10": "restaurants",
  "56.30": "bars-cafes",
  "68.20": "rent",
  "68.32": "home-charges",
  "77.11": "other-travel",
} satisfies NafCategoryTable;

const CATEGORY_BY_NAF_SUBCLASS = {
  "47.11B": "groceries",
  "47.73Z": "pharmacy",
  "47.78A": "medical",
  "47.78B": "energy",
  "56.10A": "restaurants",
  "56.10C": "takeaway",
} satisfies NafCategoryTable;

const categoryIn = (
  table: Partial<NafCategoryTable>,
  nafCode: string
): SpendingCategory | undefined => table[nafCode];

export const mapNafToCategory = (nafCode: string): SpendingCategory | null => {
  const code = nafCode.trim().toUpperCase();

  if (!NAF_REV2_CLASS_CODE.test(code)) {
    return null;
  }

  return (
    categoryIn(CATEGORY_BY_NAF_SUBCLASS, code) ??
    categoryIn(CATEGORY_BY_NAF_CLASS, code.slice(0, NAF_CLASS_WIDTH)) ??
    categoryIn(CATEGORY_BY_NAF_GROUP, code.slice(0, NAF_GROUP_WIDTH)) ??
    categoryIn(CATEGORY_BY_NAF_DIVISION, code.slice(0, NAF_DIVISION_WIDTH)) ??
    null
  );
};

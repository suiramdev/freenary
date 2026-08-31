import type { SpendingCategory } from "../../lib/taxonomy";

// NAF (APE) code → SpendingCategory
//
// A division names a leaf only when every consumer-facing class under it means
// the same thing (35 electricity, 36 water, 55 hotels, 61 telecoms, 75 vets,
// 86 doctors, 96 hairdressers…). An ambiguous division takes its group's
// catch-all instead, and the monothematic classes under it are pinned
// individually — e.g. 68 is `other-housing` while 68.20 is `rent`.
// Class-level entries always override the division.
//
// Keys are sorted lexicographically (eslint sort-keys).

const NAF_TO_CATEGORY = {
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
  "47.11": "groceries",
  "47.11B": "groceries",
  "47.2": "groceries",
  "47.21": "groceries",
  "47.22": "groceries",
  "47.23": "groceries",
  "47.24": "groceries",
  "47.25": "groceries",
  "47.26": "groceries",
  "47.29": "groceries",
  // These retail kinds sit outside the Shopping group in the MCC and OSM tables,
  // so the division fallback would put the same merchant in a different group.
  "47.30": "fuel",
  "47.52": "home-maintenance",
  "47.61": "hobbies",
  "47.63": "hobbies",
  "47.64": "sports",
  "47.65": "hobbies",
  "47.73": "pharmacy",
  "47.73Z": "pharmacy",
  "47.74": "medical",
  "47.75": "personal-care",
  // 47.78 splits: optical is medical, household fuels are energy (matching MCC
  // 5983), and the rest is a genuine grab-bag left to the division.
  "47.78A": "medical",
  "47.78B": "energy",
  "49": "other-transport",
  "49.10": "public-transport",
  "49.31": "public-transport",
  "49.32": "taxi",
  "50": "other-travel",
  "51": "flights",
  "52": "other-transport",
  "53": "uncategorised",
  "55": "accommodation",
  "56": "other-daily-living",
  "56.10": "restaurants",
  "56.10A": "restaurants",
  // Restauration rapide, matching MCC 5814 and amenity=fast_food.
  "56.10C": "takeaway",
  "56.30": "bars-cafes",
  "58": "other-leisure",
  "59": "culture",
  "60": "streaming",
  "61": "telecom",
  "62": "software",
  "63": "software",
  "64": "other-financial",
  "65": "other-insurance",
  "66": "other-financial",
  // Division 68 spans letting, agency fees and syndic charges, so only the
  // monothematic classes claim a leaf.
  "68": "other-housing",
  "68.20": "rent",
  "68.32": "home-charges",
  "69": "uncategorised",
  "70": "uncategorised",
  "71": "uncategorised",
  "72": "uncategorised",
  "73": "uncategorised",
  "74": "uncategorised",
  "75": "pets",
  // Division 77 rents out anything from tools to cars, so it claims no more
  // than "goods"; car rental itself follows MCC 7512 into travel.
  "77": "other-shopping",
  "77.11": "other-travel",
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
} as const satisfies Record<string, SpendingCategory>;

/**
 * Resolve a NAF/APE code to a spending category.
 * Tries the full code first, then progressively shorter prefixes down to
 * the 2-digit division. Returns null when no mapping exists.
 */
export const mapNafToCategory = (nafCode: string): SpendingCategory | null => {
  if (!nafCode) {
    return null;
  }

  const trimmed = nafCode.trim();

  // Try full code, then strip trailing characters until we reach the 2-digit division.
  // SAFETY: cast is needed because dynamic key lookup returns string | undefined
  const full = NAF_TO_CATEGORY[trimmed as keyof typeof NAF_TO_CATEGORY] as
    | SpendingCategory
    | undefined;
  if (full) {
    return full;
  }

  // Try without the trailing letter (e.g. '47.73Z' → '47.73')
  const noLetter = trimmed.replace(/[A-Z]$/iu, "");
  if (noLetter !== trimmed) {
    // SAFETY: cast is needed because dynamic key lookup returns string | undefined
    const hit = NAF_TO_CATEGORY[noLetter as keyof typeof NAF_TO_CATEGORY] as
      | SpendingCategory
      | undefined;
    if (hit) {
      return hit;
    }
  }

  // Try group level (e.g. '47.73' → '47.7')
  const group = trimmed.slice(0, 4);
  if (group.length >= 4) {
    // SAFETY: cast is needed because dynamic key lookup returns string | undefined
    const hit = NAF_TO_CATEGORY[group as keyof typeof NAF_TO_CATEGORY] as
      | SpendingCategory
      | undefined;
    if (hit) {
      return hit;
    }
  }

  // Division level (first 2 digits)
  const division = trimmed.slice(0, 2);
  // SAFETY: cast is needed because dynamic key lookup returns string | undefined
  return (
    (NAF_TO_CATEGORY[division as keyof typeof NAF_TO_CATEGORY] as
      | SpendingCategory
      | undefined) ?? null
  );
};

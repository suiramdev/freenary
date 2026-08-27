import type { SpendingCategory } from "../../lib/mcc-categories";

// ---------------------------------------------------------------------------
// NAF (APE) code → SpendingCategory
//
// Division-level (2-digit prefix) entries provide broad coverage.
// Class-level (full code) entries override the division when the default
// mapping is wrong — e.g. pharmacy 47.73Z is health, not shopping.
//
// Keys are sorted lexicographically (eslint sort-keys).
// ---------------------------------------------------------------------------

const NAF_TO_CATEGORY = {
  "01": "groceries",
  "02": "other",
  "03": "groceries",
  "05": "other",
  "06": "other",
  "07": "other",
  "08": "other",
  "09": "other",
  "10": "groceries",
  "11": "groceries",
  "12": "groceries",
  "13": "shopping",
  "14": "shopping",
  "15": "shopping",
  "16": "shopping",
  "17": "shopping",
  "18": "shopping",
  "19": "utilities",
  "20": "other",
  "21": "health",
  "22": "other",
  "23": "other",
  "24": "other",
  "25": "other",
  "26": "shopping",
  "27": "shopping",
  "28": "other",
  "29": "other",
  "30": "other",
  "31": "shopping",
  "32": "shopping",
  "33": "other",
  "35": "utilities",
  "36": "utilities",
  "37": "other",
  "38": "other",
  "39": "other",
  "41": "housing",
  "42": "other",
  "43": "housing",
  "45": "transport",
  "46": "shopping",
  "47": "shopping",
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
  "47.73": "health",
  "47.73Z": "health",
  "49": "transport",
  "50": "travel",
  "51": "travel",
  "52": "transport",
  "53": "other",
  "55": "travel",
  "56": "dining",
  "56.10": "dining",
  "56.10A": "dining",
  "58": "utilities",
  "59": "entertainment",
  "60": "utilities",
  "61": "utilities",
  "62": "utilities",
  "63": "utilities",
  "64": "transfers",
  "65": "transfers",
  "66": "insurance",
  "68": "housing",
  "69": "other",
  "70": "other",
  "71": "other",
  "72": "other",
  "73": "other",
  "74": "other",
  "75": "other",
  "77": "shopping",
  "78": "other",
  "79": "travel",
  "80": "other",
  "81": "housing",
  "82": "other",
  "84": "taxes",
  "85": "education",
  "86": "health",
  "87": "health",
  "88": "health",
  "90": "entertainment",
  "91": "entertainment",
  "92": "entertainment",
  "93": "entertainment",
  "94": "other",
  "95": "shopping",
  "96": "shopping",
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

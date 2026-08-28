/**
 * French locale-specific keyword heuristics for deriveCategory.
 *
 * This module has NO imports from the normalise/institution chain to
 * avoid circular dependencies (that chain imports mcc-categories.ts,
 * which consumes these keywords).
 */

import type { SpendingCategory } from "../../lib/mcc-categories";

/** Bank-transaction-code keywords (French). */
export const bankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  [/loyer|bail/u, "housing"],
  [/salaire|traitement/u, "income"],
  [/assurance|mutuelle/u, "insurance"],
  [/imp[oô]t|pr[eé]l[eè]vement social/u, "taxes"],
  [/virement/u, "transfers"],
];

/** Counterparty-name keywords (French). */
export const counterpartyKeywords: readonly [RegExp, SpendingCategory][] = [
  [/\bsci\b|hlm|opac|bailleur/u, "housing"],
  [/pharmacie/u, "health"],
];

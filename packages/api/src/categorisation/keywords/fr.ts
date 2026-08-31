/**
 * French locale-specific keyword heuristics for deriveCategory.
 *
 * This module has NO imports from the normalise/institution chain to
 * avoid circular dependencies (that chain imports mcc-categories.ts,
 * which consumes these keywords).
 */

import type { SpendingCategory } from "../../lib/taxonomy";

/** Bank-transaction-code keywords (French). */
export const bankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  [/loyer|bail/u, "rent"],
  [/salaire|traitement/u, "salary"],
  [/assurance|mutuelle/u, "other-insurance"],
  [/imp[oô]t|pr[eé]l[eè]vement social/u, "other-taxes"],
  [/virement/u, "other-transfer"],
];

/** Counterparty-name keywords (French). */
export const counterpartyKeywords: readonly [RegExp, SpendingCategory][] = [
  [/\bsci\b|hlm|opac|bailleur/u, "rent"],
  [/pharmacie/u, "pharmacy"],
];

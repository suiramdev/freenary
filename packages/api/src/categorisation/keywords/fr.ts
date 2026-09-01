/**
 * French locale-specific keyword heuristics — the country layer over
 * default.ts. Patterns are token-anchored and spell out the inflected forms
 * French banks write ("impôts", "loyers").
 *
 * This module has NO imports from the normalise/institution chain to
 * avoid circular dependencies (that chain imports mcc-categories.ts,
 * which consumes these keywords).
 */

import type { SpendingCategory } from "../../lib/taxonomy";
import { tokens } from "./anchor";

/** Bank-transaction-code keywords (French). */
export const bankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  [tokens("loyers?|bail|baux"), "rent"],
  [tokens("salaires?|traitements?"), "salary"],
  [tokens("assurances?|mutuelles?"), "other-insurance"],
  [
    tokens("imp[oô]ts?|pr[eé]l[eè]vement social|pr[eé]l[eè]vements sociaux"),
    "other-taxes",
  ],
  [tokens("virements?"), "other-transfer"],
];

/** Counterparty-name keywords (French). */
export const counterpartyKeywords: readonly [RegExp, SpendingCategory][] = [
  [tokens("sci|hlm|opac|bailleurs?"), "rent"],
  [tokens("pharmacies?"), "pharmacy"],
];

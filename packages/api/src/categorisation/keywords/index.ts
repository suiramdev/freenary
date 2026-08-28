/**
 * Country-specific keyword heuristics for deriveCategory.
 *
 * Each country file defines locale-specific bank-code and counterparty
 * keywords. Adding a country = one new file + one entry here.
 *
 * This module is deliberately separate from the normalise/institution
 * chain to avoid circular dependencies.
 */

import type { SpendingCategory } from "../../lib/mcc-categories";
import * as fr from "./fr";

const countries = [fr] as const;

/** Combined bank-transaction-code keywords across all countries. */
export const allBankCodeKeywords: readonly [RegExp, SpendingCategory][] =
  countries.flatMap((c) => c.bankCodeKeywords);

/** Combined counterparty-name keywords across all countries. */
export const allCounterpartyKeywords: readonly [RegExp, SpendingCategory][] =
  countries.flatMap((c) => c.counterpartyKeywords);

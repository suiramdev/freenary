/**
 * Country-specific keyword heuristics for deriveCategory.
 *
 * Each country file defines locale-specific bank-code and counterparty
 * keywords. Adding a country = one new file, one entry in the registry
 * below, and one entry in supported-countries.ts.
 *
 * This module is deliberately separate from the normalise/institution
 * chain to avoid circular dependencies.
 */

import type { SpendingCategory } from "../../lib/mcc-categories";
import { SUPPORTED_COUNTRIES } from '../supported-countries';
import type { SupportedCountry } from '../supported-countries';
import * as fr from "./fr";

interface KeywordModule {
  readonly bankCodeKeywords: readonly [RegExp, SpendingCategory][];
  readonly counterpartyKeywords: readonly [RegExp, SpendingCategory][];
}

/**
 * Registry of keyword modules keyed by country code.
 * Must stay in sync with SUPPORTED_COUNTRIES — the type-level check
 * below enforces this at compile time.
 */
const registry: Record<SupportedCountry, KeywordModule> = {
  FR: fr,
} satisfies Record<SupportedCountry, KeywordModule>;

const countries = SUPPORTED_COUNTRIES.map((code) => registry[code]);

/** Combined bank-transaction-code keywords across all countries. */
export const allBankCodeKeywords: readonly [RegExp, SpendingCategory][] =
  countries.flatMap((c) => c.bankCodeKeywords);

/** Combined counterparty-name keywords across all countries. */
export const allCounterpartyKeywords: readonly [RegExp, SpendingCategory][] =
  countries.flatMap((c) => c.counterpartyKeywords);

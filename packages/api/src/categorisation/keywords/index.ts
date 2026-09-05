/**
 * Keyword tables for the deterministic categorisation layer.
 *
 * Two layers, resolved country over default. Adding a
 * country = one new file, one entry in the registry below, and one entry in
 * supported-countries.ts.
 *
 * This module is deliberately separate from the normalise/institution
 * chain to avoid circular dependencies.
 */

import type { SpendingCategory } from "../../lib/taxonomy";
import { SUPPORTED_COUNTRIES } from "../supported-countries";
import type { SupportedCountry } from "../supported-countries";
import * as defaults from "./default";
import * as fr from "./fr";

interface KeywordModule {
  readonly bankCodeKeywords: readonly [RegExp, SpendingCategory][];
  readonly counterpartyKeywords: readonly [RegExp, SpendingCategory][];
  readonly merchantQualifiers: readonly string[];
}

/** The tables one lookup needs, already in layer order. */
export interface KeywordTables {
  readonly bankCode: readonly (readonly [RegExp, SpendingCategory])[];
  readonly counterparty: readonly (readonly [RegExp, SpendingCategory])[];
  readonly merchantQualifiers: ReadonlySet<string>;
}

/**
 * Registry of keyword modules keyed by country code.
 * Must stay in sync with SUPPORTED_COUNTRIES — the type-level check
 * below enforces this at compile time.
 */
const registry = {
  FR: fr,
} satisfies Record<SupportedCountry, KeywordModule>;

const countries = SUPPORTED_COUNTRIES.map((code) => registry[code]);

const layer = (country?: KeywordModule): KeywordTables => ({
  bankCode: country
    ? [...country.bankCodeKeywords, ...defaults.bankCodeKeywords]
    : defaults.bankCodeKeywords,
  counterparty: country
    ? [...country.counterpartyKeywords, ...defaults.counterpartyKeywords]
    : defaults.counterpartyKeywords,
  merchantQualifiers: new Set([
    ...(country?.merchantQualifiers ?? []),
    ...defaults.merchantQualifiers,
  ]),
});

// Concatenated once at module load: the lookup runs per transaction, so the
// layers must not be spread on every call.
const DEFAULT_TABLES = layer();

const TABLES_BY_COUNTRY: Record<string, KeywordTables> = {};
for (const code of SUPPORTED_COUNTRIES) {
  TABLES_BY_COUNTRY[code] = layer(registry[code]);
}

/**
 * Tables for one transaction's country: that country's rules first, defaults
 * after. A country without a deterministic layer gets the defaults alone.
 */
export const keywordsFor = (country?: string | null): KeywordTables =>
  (country ? TABLES_BY_COUNTRY[country.toUpperCase()] : undefined) ??
  DEFAULT_TABLES;

// The flattened lists keep default-before-country order. A caller with no
// country searches every layer at once, where a country's generic catch-all
// ("virement") must not outrank a specific default keyword.

/** Every layer flattened, for the callers that have no country to dispatch on. */
export const allBankCodeKeywords: readonly [RegExp, SpendingCategory][] = [
  ...defaults.bankCodeKeywords,
  ...countries.flatMap((c) => c.bankCodeKeywords),
];

/** Every layer flattened, for the callers that have no country to dispatch on. */
export const allCounterpartyKeywords: readonly [RegExp, SpendingCategory][] = [
  ...defaults.counterpartyKeywords,
  ...countries.flatMap((c) => c.counterpartyKeywords),
];

/** First category whose pattern matches the text, or null. */
export const matchKeyword = (
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

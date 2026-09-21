import type { SpendingCategory } from "../../lib/taxonomy";
import { SUPPORTED_COUNTRIES } from "../supported-countries";
import type { SupportedCountry } from "../supported-countries";
import * as defaults from "./default";
import * as fr from "./fr";

type KeywordRule = readonly [RegExp, SpendingCategory];

interface KeywordModule {
  readonly bankCodeKeywords: readonly KeywordRule[];
  readonly merchantQualifiers: readonly string[];
}

export interface KeywordTables {
  readonly bankCode: readonly KeywordRule[];
  readonly merchantQualifiers: ReadonlySet<string>;
}

const registry = {
  FR: fr,
} satisfies Record<SupportedCountry, KeywordModule>;

const layerCountryOverDefaults = (
  country: KeywordModule | null
): KeywordTables => ({
  bankCode: country
    ? [...country.bankCodeKeywords, ...defaults.bankCodeKeywords]
    : defaults.bankCodeKeywords,
  merchantQualifiers: new Set([
    ...(country?.merchantQualifiers ?? []),
    ...defaults.merchantQualifiers,
  ]),
});

const DEFAULTS_ONLY_TABLES = layerCountryOverDefaults(null);

const TABLES_BY_COUNTRY: Record<string, KeywordTables> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((code) => [
    code,
    layerCountryOverDefaults(registry[code]),
  ])
);

export const keywordsFor = (country: string | null = null): KeywordTables =>
  (country ? TABLES_BY_COUNTRY[country.toUpperCase()] : undefined) ??
  DEFAULTS_ONLY_TABLES;

export const matchKeyword = (
  table: readonly KeywordRule[],
  text: string
): SpendingCategory | null => {
  for (const [pattern, category] of table) {
    if (pattern.test(text)) {
      return category;
    }
  }

  return null;
};

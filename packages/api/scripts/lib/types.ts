import type { SpendingCategory } from "../../src/lib/taxonomy";

export interface DictionaryAlias {
  alias: string;
  normalisedAlias: string;
}

export interface DictionaryMerchant {
  /** Stable id, e.g. "nsi:carrefour" or "wd:Q217599". */
  id: string;
  name: string;
  /** normaliseDescriptor(name) — the match key. */
  normalisedName: string;
  /** Alternative spellings; each already normalised at build time. */
  aliases: DictionaryAlias[];
  /** Known web domains, lowercase, no scheme. */
  domains: string[];
  /** Mapped SpendingCategory, or null when the OSM tag has no confident mapping. */
  category: SpendingCategory | null;
  /** Provenance, e.g. "nsi". */
  source: string;
  /** The originating OSM tag, e.g. "shop=supermarket". Kept for auditability. */
  osmTag: string | null;
  /**
   * ISO 3166-1 alpha-2 countries the merchant is scoped to: NSI geographic
   * scope, or Wikidata P17. Empty means unscoped rather than absent everywhere —
   * a worldwide brand names no country.
   */
  countries: string[];
}

export interface CuratedEntry {
  name: string;
  category: SpendingCategory;
}

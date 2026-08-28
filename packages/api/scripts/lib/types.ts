import type { SpendingCategory } from "../../src/lib/mcc-categories";

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
}

export interface CuratedEntry {
  name: string;
  category: SpendingCategory;
}

import type { SpendingCategory } from "../../src/lib/taxonomy";

export interface DictionaryAlias {
  alias: string;
  normalisedAlias: string;
}

export interface DictionaryMerchant {
  id: string;
  name: string;
  normalisedName: string;
  aliases: DictionaryAlias[];
  domains: string[];
  category: SpendingCategory | null;
  source: string;
  osmTag: string | null;
  countries: string[];
}

export interface CuratedEntry {
  name: string;
  category: SpendingCategory;
}

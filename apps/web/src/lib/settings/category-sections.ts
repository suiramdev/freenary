import type { CategoryEntry } from "@freenary/api/lib/categories";

import { foldForSearch } from "@/lib/search-text";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";

/** A group heading with the categories under it; `heading` is null for a custom group. */
export interface CategorySection {
  heading: CategoryEntry | null;
  items: CategoryEntry[];
  /**
   * Unique per section. A heading-less section takes its own entry's key,
   * because several top-level custom categories can coexist.
   */
  key: string;
}

/**
 * Groups the flat `listCategories` list into pickable sections, keeping only
 * entries matching `query`. Sections exist so each heading names its own items
 * rather than the whole radio group, and empty ones are dropped so a heading
 * never survives without something under it. Matching runs on the translated
 * label, so a French reader searches the words they can see.
 */
export const toCategorySections = (
  categories: CategoryEntry[],
  query: string
): CategorySection[] => {
  const needle = foldForSearch(query.trim());
  const sections: CategorySection[] = [];

  for (const entry of categories) {
    if (entry.isGroup && !entry.isCustom) {
      sections.push({ heading: entry, items: [], key: entry.key });
      continue;
    }
    const matches =
      !needle ||
      (entry.isAssignable &&
        foldForSearch(categoryEntryLabel(entry)).includes(needle));
    if (!matches) {
      continue;
    }
    // A custom top-level category is its own group, so it opens a new section.
    const open = entry.isGroup ? null : sections.at(-1);
    if (open) {
      open.items.push(entry);
    } else {
      sections.push({ heading: null, items: [entry], key: entry.key });
    }
  }

  return sections.filter((section) => section.items.length > 0);
};

import type { CategoryEntry } from "@freenary/api/lib/categories";

import { foldForSearch } from "@/lib/search-text";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";

export interface CategorySection {
  heading: CategoryEntry | null;
  items: CategoryEntry[];
  key: string;
}

export const toCategorySections = (
  categories: CategoryEntry[],
  query: string
): CategorySection[] => {
  const needle = foldForSearch(query.trim());
  const sections: CategorySection[] = [];

  for (const entry of categories) {
    const isPredefinedGroup = entry.isGroup && !entry.isCustom;

    if (isPredefinedGroup) {
      sections.push({ heading: entry, items: [], key: entry.key });
      continue;
    }

    const matchesTranslatedLabel =
      !needle ||
      (entry.isAssignable &&
        foldForSearch(categoryEntryLabel(entry)).includes(needle));

    if (!matchesTranslatedLabel) {
      continue;
    }

    const isGroupOfItsOwn = entry.isGroup;
    const openSection = isGroupOfItsOwn ? null : sections.at(-1);

    if (openSection) {
      openSection.items.push(entry);
    } else {
      sections.push({ heading: null, items: [entry], key: entry.key });
    }
  }

  return sections.filter((section) => section.items.length > 0);
};

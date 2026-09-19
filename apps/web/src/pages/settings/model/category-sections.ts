import type { CategoryEntry } from "@freenary/api/lib/categories";

import { categoryEntryLabel } from "@/entities/category";
import { foldForSearch } from "@/shared/lib/search-text";

import type { EditedCustomCategory } from "./use-custom-category-form";

export interface CategorySection {
  heading: CategoryEntry | null;
  items: CategoryEntry[];
  key: string;
}

export const editedOf = (entry: CategoryEntry): EditedCustomCategory => ({
  color: entry.pickedColor ?? entry.color,
  icon: entry.icon,
  id: entry.key.split(":")[1] ?? "",
  label: entry.label,
  // SAFETY: parentKey on a custom entry is always a CategoryGroup slug
  parentSlug: entry.parentKey as EditedCustomCategory["parentSlug"],
});

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

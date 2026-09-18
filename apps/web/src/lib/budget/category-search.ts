import { foldForSearch } from "@/lib/search-text";

export interface CategoryRow {
  group: string;
  label: string;
  value: string;
}

export const categoryRowMatches = (
  row: CategoryRow,
  query: string
): boolean => {
  const needle = foldForSearch(query.trim());

  return (
    needle === "" ||
    foldForSearch(row.label).includes(needle) ||
    foldForSearch(row.group).includes(needle)
  );
};

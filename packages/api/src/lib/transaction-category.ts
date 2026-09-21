import { resolveCategorySlug } from "./taxonomy";
import type { SpendingCategory } from "./taxonomy";

export const pipelineCategory = (tx: {
  resolvedCategory: string | null;
}): SpendingCategory =>
  (tx.resolvedCategory ? resolveCategorySlug(tx.resolvedCategory) : null) ??
  "uncategorised";

export const effectiveCategory = (tx: {
  category: string | null;
  resolvedCategory: string | null;
}): SpendingCategory =>
  (tx.category ? resolveCategorySlug(tx.category) : null) ??
  pipelineCategory(tx);

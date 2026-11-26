import type { Prisma } from "@freenary/db";

import { SAVING_CATEGORIES } from "./account-types";
import { INTERNAL_TRANSFER_CATEGORY } from "./taxonomy";
import type { SpendingCategory } from "./taxonomy";
import { effectiveCategory } from "./transaction-category";

const isEffectively = (
  categories: readonly string[]
): Prisma.TransactionWhereInput => ({
  OR: [
    { category: { in: [...categories] } },
    { category: null, resolvedCategory: { in: [...categories] } },
  ],
});

const isNotEffectively = (category: string): Prisma.TransactionWhereInput => ({
  OR: [
    { AND: [{ category: { not: null } }, { category: { not: category } }] },
    { category: null, resolvedCategory: null },
    {
      AND: [
        { category: null },
        { resolvedCategory: { not: null } },
        { resolvedCategory: { not: category } },
      ],
    },
  ],
});

export const countedWholeWhere: Prisma.TransactionWhereInput = {
  AND: [
    { exclusion: null, isInternalTransfer: false },
    isNotEffectively(INTERNAL_TRANSFER_CATEGORY),
  ],
};

export const countedInFiguresWhere: Prisma.TransactionWhereInput = {
  AND: [
    { exclusion: null },
    {
      OR: [
        countedWholeWhere,
        {
          AND: [{ isInternalTransfer: true }, isEffectively(SAVING_CATEGORIES)],
        },
        { exchangeFeeMinor: { gt: 0 }, isInternalTransfer: true },
      ],
    },
  ],
};

const SAVING_CATEGORY_SLUGS = new Set<SpendingCategory>(SAVING_CATEGORIES);

export type CountedShare = "exchange-fee" | "none" | "whole";

export const countedShareOf = (row: {
  category: string | null;
  exchangeFeeMinor: number | null;
  exclusion?: string | null;
  isInternalTransfer: boolean;
  resolvedCategory: string | null;
}): CountedShare => {
  if (row.exclusion) {
    return "none";
  }

  const category = effectiveCategory(row);

  if (row.isInternalTransfer && SAVING_CATEGORY_SLUGS.has(category)) {
    return "whole";
  }

  if (row.isInternalTransfer) {
    return (row.exchangeFeeMinor ?? 0) > 0 ? "exchange-fee" : "none";
  }

  return category === INTERNAL_TRANSFER_CATEGORY ? "none" : "whole";
};

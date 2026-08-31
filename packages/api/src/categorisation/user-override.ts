import prisma from "@freenary/db";
import type { Prisma } from "@freenary/db";

import type { SpendingCategory } from "../lib/taxonomy";

type TransactionClient = Prisma.TransactionClient;

/**
 * Look up a user's category override for a merchant key.
 * Returns the override category and optional merchant name, or null.
 */
export const lookupUserOverride = async (
  userId: string,
  merchantKey: string
): Promise<{
  category: SpendingCategory;
  merchantName: string | null;
} | null> => {
  try {
    const override = await prisma.merchantOverride.findUnique({
      where: { userId_merchantKey: { merchantKey, userId } },
    });

    if (!override) {
      return null;
    }

    return {
      // SAFETY: category column only stores validated SpendingCategory values
      category: override.category as SpendingCategory,
      merchantName: override.merchantName,
    };
  } catch {
    return null;
  }
};

/**
 * Upsert a user's category override for a merchant key.
 * Accepts an optional transaction client for atomicity.
 */
export const upsertUserOverride = async (
  userId: string,
  merchantKey: string,
  category: SpendingCategory,
  merchantName?: string | null,
  db?: TransactionClient
): Promise<void> => {
  try {
    const client = db ?? prisma;
    const name = merchantName ?? null;

    await client.merchantOverride.upsert({
      create: { category, merchantKey, merchantName: name, userId },
      update: { category, merchantName: name },
      where: { userId_merchantKey: { merchantKey, userId } },
    });
  } catch {
    // swallow — pipeline stage must never break transaction sync
  }
};

/**
 * Delete a user's category override (reset to auto).
 * Accepts an optional transaction client for atomicity.
 */
export const deleteUserOverride = async (
  userId: string,
  merchantKey: string,
  db?: TransactionClient
): Promise<void> => {
  try {
    const client = db ?? prisma;

    await client.merchantOverride.deleteMany({
      where: { merchantKey, userId },
    });
  } catch {
    // swallow — pipeline stage must never break transaction sync
  }
};

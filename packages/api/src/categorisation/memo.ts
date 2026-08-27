/**
 * Stage 1: descriptor memo lookup.
 *
 * A user-scoped row always shadows the global row. Global rows are never
 * mutated from a single user's correction — that is both a correctness
 * and a privacy requirement.
 */

import type { Prisma } from "@freenary/db";
import prisma from "@freenary/db";

import type { SpendingCategory } from "../lib/mcc-categories";
import type { MemoHit, UpsertUserMemoInput } from "./types";

interface MemoRow {
  id: string;
  userId: string | null;
  merchantId: string | null;
  merchantName: string | null;
  intermediaryId: string | null;
  category: string | null;
  source: string;
}

/**
 * Look up a memo for the given descriptor, preferring user-scoped over global.
 * Returns null when no memo exists.
 */
export const lookupMemo = async (
  userId: string,
  normalisedDescriptor: string
): Promise<MemoHit | null> => {
  // Single query: fetch both user-scoped and global, order so user wins
  const rows = await prisma.$queryRaw<MemoRow[]>`
    SELECT
      dm."id",
      dm."userId",
      dm."merchantId",
      m."name" AS "merchantName",
      dm."intermediaryId",
      dm."category",
      dm."source"
    FROM "descriptor_memo" dm
    LEFT JOIN "merchant" m ON m."id" = dm."merchantId"
    WHERE dm."normalisedDescriptor" = ${normalisedDescriptor}
      AND (dm."userId" = ${userId} OR dm."userId" IS NULL)
    ORDER BY dm."userId" IS NULL ASC
    LIMIT 1
  `;

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    // SAFETY: category column stores validated SpendingCategory values or null
    category: row.category as SpendingCategory | null,
    intermediaryId: row.intermediaryId,
    isUserScoped: row.userId !== null,
    memoId: row.id,
    merchantId: row.merchantId,
    merchantName: row.merchantName,
    source: row.source,
  };
};

/** Increment the hit counter. Failure must not break resolution. */
export const recordMemoHit = async (memoId: string): Promise<void> => {
  await prisma.descriptorMemo.update({
    data: { hitCount: { increment: 1 } },
    where: { id: memoId },
  });
};

/**
 * Upsert a USER-scoped memo. Never touches global rows.
 */
export const upsertUserMemo = async (
  input: UpsertUserMemoInput,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> => {
  await db.descriptorMemo.upsert({
    create: {
      category: input.category,
      intermediaryId: input.intermediaryId ?? null,
      merchantId: input.merchantId ?? null,
      normalisedDescriptor: input.normalisedDescriptor,
      source: "user-correction",
      userId: input.userId,
    },
    update: {
      category: input.category,
      intermediaryId: input.intermediaryId ?? null,
      merchantId: input.merchantId ?? null,
      source: "user-correction",
    },
    where: {
      userId_normalisedDescriptor: {
        normalisedDescriptor: input.normalisedDescriptor,
        userId: input.userId,
      },
    },
  });
};

/** Delete a user-scoped memo (reset to auto). Never touches global rows. */
export const deleteUserMemo = async (
  userId: string,
  normalisedDescriptor: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> => {
  await db.descriptorMemo.deleteMany({
    where: { normalisedDescriptor, userId },
  });
};

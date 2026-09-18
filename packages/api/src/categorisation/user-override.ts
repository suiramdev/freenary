import prisma from "@freenary/db";
import type { Prisma } from "@freenary/db";
import { Option } from "effect";

import type { SpendingCategory } from "../lib/taxonomy";

type TransactionClient = Prisma.TransactionClient;

export const lookupUserOverride = async (
  userId: string,
  merchantKey: string
): Promise<{
  category: SpendingCategory;
  merchantName: string | null;
} | null> => {
  const stored = await prisma.merchantOverride
    .findUnique({
      where: { userId_merchantKey: { merchantKey, userId } },
    })
    .then(Option.fromNullishOr, Option.none);

  return Option.match(stored, {
    onNone: () => null,
    onSome: (override) => ({
      // SAFETY: category column only stores validated SpendingCategory values
      category: override.category as SpendingCategory,
      merchantName: override.merchantName,
    }),
  });
};

export const upsertUserOverride = async (
  userId: string,
  merchantKey: string,
  category: SpendingCategory,
  merchantName: string | null | undefined,
  db: TransactionClient | undefined
): Promise<void> => {
  const client = db ?? prisma;
  const name = merchantName ?? null;

  await client.merchantOverride
    .upsert({
      create: { category, merchantKey, merchantName: name, userId },
      update: { category, merchantName: name },
      where: { userId_merchantKey: { merchantKey, userId } },
    })
    .then(Option.some, Option.none);
};

export const deleteUserOverride = async (
  userId: string,
  merchantKey: string,
  db: TransactionClient | undefined
): Promise<void> => {
  const client = db ?? prisma;

  await client.merchantOverride
    .deleteMany({
      where: { merchantKey, userId },
    })
    .then(Option.some, Option.none);
};

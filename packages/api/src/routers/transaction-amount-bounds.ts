import type { Prisma } from "@freenary/db";

/** One `OR` over the two signs, or nothing when neither bound is set. */
export type AmountBoundsCondition = Prisma.TransactionWhereInput | null;

/**
 * Bounds on how much money moved, not on the signed amount: a floor of 5000
 * means fifty euros in either direction, so the same filter reads the same way
 * under the outgoing tab and the incoming one. Both bounds are absolute values
 * in minor units.
 */
export const amountBoundsCondition = (
  min?: number,
  max?: number
): AmountBoundsCondition => {
  if (min === undefined && max === undefined) {
    return null;
  }

  // Each branch pins its own sign: a lone ceiling on the credit branch would
  // otherwise read "amount ≤ 3000" and let every outgoing row through.
  const credit: Prisma.IntFilter = { gt: 0 };
  const debit: Prisma.IntFilter = { lt: 0 };
  if (min !== undefined) {
    credit.gte = min;
    debit.lte = -min;
  }
  if (max !== undefined) {
    credit.lte = max;
    debit.gte = -max;
  }

  return { OR: [{ amount: credit }, { amount: debit }] };
};

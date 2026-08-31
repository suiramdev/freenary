/**
 * Internal transfer detection.
 *
 * Pairs the two legs of a movement between a user's own accounts:
 * the outgoing debit on one account and the incoming credit on another.
 * Runs as a separate pass right after sync, before the categorisation cascade.
 * Never throws — a failure here must not break transaction sync.
 */

import prisma from "@freenary/db";

import type { ResolutionStage } from "./types";

// Constants

const TRANSFER_CATEGORY = "internal-transfer";
const TRANSFER_STAGE: ResolutionStage = "channel";
const TRANSFER_CONFIDENCE = 0.95;

/** Maximum milliseconds between two transaction dates to consider them a pair (1 day). */
const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

// Implementation

const matchInternal = async (userId: string): Promise<number> => {
  // 1. Collect accounts across the user's bank connections
  const accounts = await prisma.bankAccount.findMany({
    select: { id: true, identificationHash: true },
    where: {
      connection: { userId },
    },
  });

  if (accounts.length < 2) {
    return 0;
  }

  const accountIdSet = new Set<string>();

  for (const account of accounts) {
    accountIdSet.add(account.id);
  }

  // 2. Find candidate transactions:
  //    - belong to this user's accounts
  //    - not already marked as internal transfer
  //    - not manually categorised
  //    Intentionally includes already-categorised transactions: a transfer
  //    mis-categorised as income/expense wrecks budget figures.
  const candidates = await prisma.transaction.findMany({
    orderBy: { date: "asc" },
    select: {
      accountId: true,
      amount: true,
      currency: true,
      date: true,
      id: true,
    },
    where: {
      accountId: { in: [...accountIdSet] },
      categoryOverride: false,
      isInternalTransfer: false,
    },
  });

  if (candidates.length === 0) {
    return 0;
  }

  // 3. Pair opposite-sign transactions with equal absolute amounts within ±1 day
  const matched = new Set<string>();

  // Index outgoing transactions (amount < 0) by absolute amount for fast lookup
  const outgoingByAmount = new Map<number, typeof candidates>();

  for (const tx of candidates) {
    if (tx.amount < 0) {
      const absAmount = -tx.amount;
      const bucket = outgoingByAmount.get(absAmount);
      if (bucket) {
        bucket.push(tx);
      } else {
        outgoingByAmount.set(absAmount, [tx]);
      }
    }
  }

  for (const tx of candidates) {
    if (tx.amount <= 0 || matched.has(tx.id)) {
      continue;
    }

    const bucket = outgoingByAmount.get(tx.amount);
    if (!bucket) {
      continue;
    }

    for (const candidate of bucket) {
      if (matched.has(candidate.id)) {
        continue;
      }
      // Must be on a different account
      if (candidate.accountId === tx.accountId) {
        continue;
      }

      if (candidate.currency !== tx.currency) {
        continue;
      }

      // Date proximity: same day or ±1 day
      const diff = Math.abs(tx.date.getTime() - candidate.date.getTime());
      if (diff > DATE_TOLERANCE_MS) {
        continue;
      }

      // Both transactions belong to the user's accounts (guaranteed by query)
      // and are on different accounts with matching amounts and date proximity
      // — that is sufficient to detect internal transfers regardless of IBAN availability

      matched.add(tx.id);
      matched.add(candidate.id);
      break;
    }
  }

  if (matched.size === 0) {
    return 0;
  }

  // 4. Bulk-update all matched transactions
  const { count } = await prisma.transaction.updateMany({
    data: {
      isInternalTransfer: true,
      resolutionConfidence: TRANSFER_CONFIDENCE,
      resolutionStage: TRANSFER_STAGE,
      resolvedCategory: TRANSFER_CATEGORY,
    },
    where: { id: { in: [...matched] } },
  });

  return count;
};

/**
 * Mark internal transfers among transactions for a user.
 * Returns the number of transactions marked.
 */
export const matchInternalTransfers = async (
  userId: string
): Promise<number> => {
  try {
    return await matchInternal(userId);
  } catch {
    return 0;
  }
};

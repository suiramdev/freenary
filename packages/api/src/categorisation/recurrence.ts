/**
 * Recurrence and subscription detection.
 *
 * Runs after the categorisation pipeline over already-categorised history
 * with stable merchant keys. Groups outgoing transactions by merchant key,
 * computes inter-transaction intervals, and classifies the cadence as
 * weekly / monthly / quarterly / annual / irregular.
 *
 * Pure read operation — never writes to the database.
 * Never throws — returns an empty array on any error.
 */

import prisma from "@freenary/db";

import type { SpendingCategory } from "../lib/mcc-categories";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RecurringExpense {
  /** The merchant key that recurs. */
  merchantKey: string;
  /** Best counterparty name seen for this key. */
  merchantName: string | null;
  /** The category assigned to this merchant. */
  category: SpendingCategory;
  /** Detected interval in days (e.g. 30 for monthly, 365 for annual). */
  intervalDays: number;
  /** Label: "weekly", "monthly", "quarterly", "annual", "irregular". */
  frequency: "weekly" | "monthly" | "quarterly" | "annual" | "irregular";
  /** Typical amount in minor units (median of observed amounts). */
  typicalAmountMinor: number;
  /** Currency. */
  currency: string;
  /** Number of occurrences in the observation window. */
  occurrences: number;
  /** Date of the most recent occurrence. */
  lastSeen: Date;
  /** Date of the next expected occurrence. */
  nextExpected: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Observation window: 12 months in milliseconds. */
const WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

/** Milliseconds per day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Frequency bands: [min days, max days, label, minimum occurrences]. */
const FREQUENCY_BANDS: readonly (readonly [
  number,
  number,
  RecurringExpense["frequency"],
  number,
])[] = [
  [5, 9, "weekly", 4],
  [25, 35, "monthly", 3],
  [80, 100, "quarterly", 2],
  [340, 395, "annual", 2],
] as const;

/** Guard constants for the `"irregular"` fallback. */
const IRREGULAR_MIN_OCCURRENCES = 4;
const IRREGULAR_MIN_DAYS = 10;
const IRREGULAR_MAX_DAYS = 400;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Median of a pre-sorted numeric array. */
const median = (sorted: number[]): number => {
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }

  return sorted[mid] ?? 0;
};

/** Most common value in an array; falls back to the first element. */
const mode = <T>(values: T[]): T => {
  const counts = new Map<T, number>();

  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  let best = values[0];
  // SAFETY: values always has at least one element when called
  let bestCount = 0;

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  // SAFETY: values is non-empty, so best is always assigned
  return best as T;
};

/** Classify median interval into a named frequency and enforce minimum occurrences. */
const classifyFrequency = (
  medianInterval: number,
  occurrences: number
): RecurringExpense["frequency"] | null => {
  for (const [min, max, label, minOccurrences] of FREQUENCY_BANDS) {
    if (medianInterval >= min && medianInterval <= max) {
      if (occurrences < minOccurrences) {
        return null;
      }

      return label;
    }
  }

  if (
    occurrences < IRREGULAR_MIN_OCCURRENCES ||
    medianInterval < IRREGULAR_MIN_DAYS ||
    medianInterval > IRREGULAR_MAX_DAYS
  ) {
    return null;
  }

  return "irregular";
};

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

interface RawTransaction {
  amount: number;
  category: string | null;
  counterpartyName: string | null;
  currency: string;
  date: Date;
  merchantKey: string | null;
  resolvedCategory: string | null;
}

/**
 * Detect recurring expenses for a user from their transaction history.
 * Looks at the last 12 months of outgoing transactions grouped by merchantKey.
 * Returns detected recurring expenses sorted by typicalAmountMinor descending.
 */
export const detectRecurringExpenses = async (
  userId: string
): Promise<RecurringExpense[]> => {
  try {
    // 1. Collect accounts across the user's bank connections
    const accounts = await prisma.bankAccount.findMany({
      select: { id: true },
      where: {
        connection: { userId },
      },
    });

    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map((a) => a.id);
    const cutoff = new Date(Date.now() - WINDOW_MS);

    // 2. Fetch outgoing transactions from the last 12 months
    const transactions: RawTransaction[] = await prisma.transaction.findMany({
      orderBy: { date: "asc" },
      select: {
        amount: true,
        category: true,
        counterpartyName: true,
        currency: true,
        date: true,
        merchantKey: true,
        resolvedCategory: true,
      },
      where: {
        accountId: { in: accountIds },
        amount: { lt: 0 },
        date: { gte: cutoff },
        isInternalTransfer: false,
        merchantKey: { not: null },
      },
    });

    if (transactions.length === 0) {
      return [];
    }

    // 3. Group by merchantKey
    const groups = new Map<string, RawTransaction[]>();

    for (const tx of transactions) {
      if (tx.merchantKey === null) {
        continue;
      }

      const existing = groups.get(tx.merchantKey);

      if (existing) {
        existing.push(tx);
      } else {
        groups.set(tx.merchantKey, [tx]);
      }
    }

    // 4. Analyse each group
    const results: RecurringExpense[] = [];

    for (const [merchantKey, txs] of groups) {
      if (txs.length < 2) {
        continue;
      }

      // Already sorted by date (orderBy above), but ensure within group
      txs.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Compute intervals between consecutive transactions (in days)
      const intervals: number[] = [];

      for (let i = 1; i < txs.length; i += 1) {
        // SAFETY: txs[i] and txs[i-1] exist within loop bounds
        const prev = txs[i - 1] as RawTransaction;
        const curr = txs[i] as RawTransaction;
        const diffMs = curr.date.getTime() - prev.date.getTime();
        intervals.push(Math.round(diffMs / MS_PER_DAY));
      }

      intervals.sort((a, b) => a - b);
      const medianInterval = median(intervals);

      // Classify and enforce minimum occurrences
      const frequency = classifyFrequency(medianInterval, txs.length);

      if (frequency === null) {
        continue;
      }

      // Median absolute amount
      const amounts = txs.map((tx) => Math.abs(tx.amount));
      amounts.sort((a, b) => a - b);
      const typicalAmountMinor = median(amounts);

      // Most recent transaction
      // SAFETY: txs has at least 2 elements
      const lastTx = txs.at(-1) as RawTransaction;

      // Most common category (prefer category, fall back to resolvedCategory)
      const categories = txs
        .map((tx) => tx.category ?? tx.resolvedCategory)
        .filter((c): c is string => c !== null);

      // SAFETY: category values come from the pipeline's validated set
      const category = (
        categories.length > 0 ? mode(categories) : "other"
      ) as SpendingCategory;

      // Currency from the most recent transaction
      const { currency } = lastTx;

      // Next expected = last seen + median interval
      const nextExpected = new Date(
        lastTx.date.getTime() + medianInterval * MS_PER_DAY
      );

      results.push({
        category,
        currency,
        frequency,
        intervalDays: Math.round(medianInterval),
        lastSeen: lastTx.date,
        merchantKey,
        merchantName: lastTx.counterpartyName,
        nextExpected,
        occurrences: txs.length,
        typicalAmountMinor: Math.round(typicalAmountMinor),
      });
    }

    // 5. Sort by typicalAmountMinor descending (biggest recurring expenses first)
    results.sort((a, b) => b.typicalAmountMinor - a.typicalAmountMinor);

    return results;
  } catch {
    return [];
  }
};

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

import type { SpendingCategory } from "../lib/taxonomy";
import { resolveCategorySlug } from "../lib/taxonomy";

// Public types

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

// Constants

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

// Helpers

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

  // SAFETY (below): callers only pass non-empty arrays, so best is a real element
  let [best] = values;
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

// Core

/** A transaction as the detector reads it. */
export interface RecurrenceTransaction {
  amount: number;
  category: string | null;
  counterpartyName: string | null;
  currency: string;
  date: Date;
  merchantKey: string | null;
  resolvedCategory: string | null;
}

/** The stretch of history a detection run observes. */
export interface RecurrenceWindow {
  from: Date;
  to: Date;
}

/**
 * Detect recurring expenses among transactions, counting only occurrences
 * inside the window. The window is enforced here, not left to the caller's
 * query, so the classification is a property of this function.
 * Returns detected recurring expenses sorted by typicalAmountMinor descending.
 */
export const recurringInWindow = (
  transactions: RecurrenceTransaction[],
  window: RecurrenceWindow
): RecurringExpense[] => {
  // 1. Group in-window transactions by merchantKey
  const groups = new Map<string, RecurrenceTransaction[]>();

  for (const tx of transactions) {
    if (
      tx.merchantKey === null ||
      tx.date < window.from ||
      tx.date > window.to
    ) {
      continue;
    }

    const existing = groups.get(tx.merchantKey);

    if (existing) {
      existing.push(tx);
    } else {
      groups.set(tx.merchantKey, [tx]);
    }
  }

  // 2. Analyse each group
  const results: RecurringExpense[] = [];

  for (const [merchantKey, txs] of groups) {
    if (txs.length < 2) {
      continue;
    }

    txs.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute intervals between consecutive transactions (in days)
    const intervals: number[] = [];

    let prev: RecurrenceTransaction | undefined;

    for (const curr of txs) {
      if (prev) {
        const diffMs = curr.date.getTime() - prev.date.getTime();
        intervals.push(Math.round(diffMs / MS_PER_DAY));
      }
      prev = curr;
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
    const lastTx = txs.at(-1) as RecurrenceTransaction;

    // Most common category (prefer category, fall back to resolvedCategory)
    const categories = txs
      .map((tx) => tx.category ?? tx.resolvedCategory)
      .filter((c): c is string => c !== null);

    // SAFETY: a stored value may predate the hierarchy, so decode it; an
    // unresolvable one falls back to "uncategorised"
    const modalCategory =
      categories.length > 0 ? mode(categories) : "uncategorised";
    const category: SpendingCategory =
      resolveCategorySlug(modalCategory) ?? "uncategorised";

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

  // 3. Biggest recurring expenses first
  results.sort((a, b) => b.typicalAmountMinor - a.typicalAmountMinor);

  return results;
};

/**
 * The window a period is classified from: the year on each side of it. A
 * cadence belongs to the merchant, not to where the reader stands, so the same
 * rent must not read fixed in one month and variable in the month before it.
 */
export const cadenceWindow = (from: Date, to: Date): RecurrenceWindow => ({
  from: new Date(from.getTime() - WINDOW_MS),
  to: new Date(to.getTime() + WINDOW_MS),
});

/** The trailing year, which is what a forward-looking commitment list means. */
export const trailingYear = (to: Date = new Date()): RecurrenceWindow => ({
  from: new Date(to.getTime() - WINDOW_MS),
  to,
});

/** Detect recurring expenses for a user across the given observation window. */
export const detectRecurringExpenses = async (
  userId: string,
  window: RecurrenceWindow
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

    // 2. Fetch outgoing transactions from the observed window
    const transactions: RecurrenceTransaction[] =
      await prisma.transaction.findMany({
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
          date: { gte: window.from, lte: window.to },
          isInternalTransfer: false,
          merchantKey: { not: null },
        },
      });

    // 3. Classify the window
    return recurringInWindow(transactions, window);
  } catch {
    return [];
  }
};

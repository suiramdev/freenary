/**
 * Recurrence and subscription detection.
 *
 * Runs after the categorisation pipeline over already-categorised history
 * with stable merchant keys. Groups outgoing transactions by merchant key,
 * computes inter-transaction intervals, and classifies the cadence as
 * weekly / monthly / quarterly / annual / irregular.
 *
 * Pure read operation — never writes to the database.
 * Never throws — returns an empty result on any error.
 */

import prisma from "@freenary/db";

import type { SpendingCategory } from "../lib/taxonomy";
import { resolveCategorySlug } from "../lib/taxonomy";

// Public types

/** Whether a repeat is a standing commitment or a repeated spending habit. */
export type RecurrenceKind = "behavioral" | "fixed";

/** How much the evidence supports the classification. */
export type RecurrenceConfidence = "confirmed" | "likely" | "pattern";

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
  /** Relative dispersion of the observed amounts; 0 when they are identical. */
  amountSpread: number;
  /** Relative dispersion of the observed intervals; 0 when perfectly regular. */
  intervalSpread: number;
  /** A standing commitment ("fixed") or a repeated habit ("behavioral"). */
  kind: RecurrenceKind;
  /** How much the evidence supports the classification. */
  confidence: RecurrenceConfidence;
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

/** At or below this amount spread the charge repeats at the same price. */
export const STABLE_AMOUNT_SPREAD = 0.05;

/** Above this amount spread the merchant is priced by the reader, not by a contract. */
export const VARIABLE_AMOUNT_SPREAD = 0.25;

/** At or below this interval spread the cadence holds a schedule. */
export const REGULAR_INTERVAL_SPREAD = 0.2;

/** Occurrences a stable fixed charge needs before it is called confirmed. */
const CONFIRMED_MIN_OCCURRENCES = 3;

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

/**
 * Relative median absolute deviation: `median(|v - median(v)|) / median(v)`.
 * A ratio rather than cents or days, so amounts and intervals are comparable
 * against the same thresholds.
 */
const relativeSpread = (values: number[]): number => {
  const sorted = values.toSorted((a, b) => a - b);
  const centre = median(sorted);

  if (centre === 0) {
    return 0;
  }

  const deviations = sorted
    .map((value) => Math.abs(value - centre))
    .toSorted((a, b) => a - b);

  return median(deviations) / centre;
};

/** The signals a classification reads, without any transaction list. */
export interface RecurrenceSignals {
  amountSpread: number;
  frequency: RecurringExpense["frequency"];
  intervalSpread: number;
  occurrences: number;
}

/** What a classification answers: the recurrence type and how sure it is. */
export interface RecurrenceClass {
  confidence: RecurrenceConfidence;
  kind: RecurrenceKind;
}

/**
 * Separate a commitment from a habit. A bank's processing date moves and a
 * utility bill's amount moves, so neither an exact date nor an exact amount is
 * required to read as fixed.
 */
export const classifyRecurrence = ({
  amountSpread,
  frequency,
  intervalSpread,
  occurrences,
}: RecurrenceSignals): RecurrenceClass => {
  const scheduled =
    frequency !== "irregular" &&
    intervalSpread <= REGULAR_INTERVAL_SPREAD &&
    amountSpread <= VARIABLE_AMOUNT_SPREAD;

  if (!scheduled) {
    return { confidence: "pattern", kind: "behavioral" };
  }

  const confirmed =
    amountSpread <= STABLE_AMOUNT_SPREAD &&
    occurrences >= CONFIRMED_MIN_OCCURRENCES;

  return { confidence: confirmed ? "confirmed" : "likely", kind: "fixed" };
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

    // Dispersion is what separates a contract from a habit that merely repeats.
    const amountSpread = relativeSpread(amounts);
    const intervalSpread = relativeSpread(intervals);
    const { confidence, kind } = classifyRecurrence({
      amountSpread,
      frequency,
      intervalSpread,
      occurrences: txs.length,
    });

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
      amountSpread,
      category,
      confidence,
      currency,
      frequency,
      intervalDays: Math.round(medianInterval),
      intervalSpread,
      kind,
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

/** One month of outgoing, split by what the spending is committed to. */
export interface RecurringMonthTotals {
  /** Outgoing on merchants detected as a repeated habit, in minor units. */
  behavioralMinor: number;
  /** Everything else, including any transaction with no merchant key. */
  discretionaryMinor: number;
  /** Outgoing on merchants detected as a standing commitment, in minor units. */
  fixedMinor: number;
  /** "YYYY-MM", with a 1-based zero-padded calendar month. */
  month: string;
}

/**
 * Split in-window outgoing per calendar month, attributing each transaction
 * through the merchant keys the detector classified. Takes the detected
 * expenses rather than recomputing them, and returns only the months it saw:
 * zero-filling a fixed span is a presentation choice the caller owns.
 */
export const recurringMonthsInWindow = (
  transactions: RecurrenceTransaction[],
  window: RecurrenceWindow,
  expenses: RecurringExpense[]
): RecurringMonthTotals[] => {
  const kinds = new Map(expenses.map((e) => [e.merchantKey, e.kind]));
  const months = new Map<string, RecurringMonthTotals>();

  for (const tx of transactions) {
    if (tx.date < window.from || tx.date > window.to) {
      continue;
    }

    // 1-based zero-padded calendar month, which is what a "YYYY-MM" key means.
    const month = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
    let totals = months.get(month);

    if (!totals) {
      totals = {
        behavioralMinor: 0,
        discretionaryMinor: 0,
        fixedMinor: 0,
        month,
      };
      months.set(month, totals);
    }

    const amount = Math.abs(tx.amount);
    const kind =
      tx.merchantKey === null ? undefined : kinds.get(tx.merchantKey);

    if (kind === "fixed") {
      totals.fixedMinor += amount;
    } else if (kind === "behavioral") {
      totals.behavioralMinor += amount;
    } else {
      totals.discretionaryMinor += amount;
    }
  }

  return [...months.values()].toSorted((a, b) =>
    a.month.localeCompare(b.month)
  );
};

/**
 * The one transaction read both aggregates share. Rows with no merchant key
 * are kept: the detector skips them, and the monthly split counts them as
 * discretionary.
 */
const outgoingInWindow = async (
  userId: string,
  window: RecurrenceWindow
): Promise<RecurrenceTransaction[]> => {
  const accounts = await prisma.bankAccount.findMany({
    select: { id: true },
    where: {
      connection: { userId },
    },
  });

  if (accounts.length === 0) {
    return [];
  }

  return prisma.transaction.findMany({
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
      accountId: { in: accounts.map((a) => a.id) },
      amount: { lt: 0 },
      date: { gte: window.from, lte: window.to },
      isInternalTransfer: false,
    },
  });
};

/** Both aggregates the recurring view needs, from a single transaction read. */
export interface RecurringDetection {
  expenses: RecurringExpense[];
  months: RecurringMonthTotals[];
}

/** Detect recurring expenses and their monthly split in one round trip. */
export const detectRecurring = async (
  userId: string,
  window: RecurrenceWindow
): Promise<RecurringDetection> => {
  try {
    const transactions = await outgoingInWindow(userId, window);
    const expenses = recurringInWindow(transactions, window);

    return {
      expenses,
      months: recurringMonthsInWindow(transactions, window, expenses),
    };
  } catch {
    return { expenses: [], months: [] };
  }
};

/** Detect recurring expenses for a user across the given observation window. */
export const detectRecurringExpenses = async (
  userId: string,
  window: RecurrenceWindow
): Promise<RecurringExpense[]> => {
  const detected = await detectRecurring(userId, window);
  return detected.expenses;
};

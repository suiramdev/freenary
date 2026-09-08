import type { SpendingCategory } from "@freenary/api/lib/taxonomy";

import type { Locale } from "@/paraglide/runtime.js";

/**
 * Everything the Recurring view reads off one response. The server detects the
 * patterns and measures the months; every figure the view shows on top of that
 * — a monthly equivalent, a yearly cost, the next occurrences, the forecast,
 * the insights — is derived here, so one payload serves the whole view and the
 * arithmetic is testable without a database.
 */

/** The vocabularies as values, so a filter can validate a URL against them. */
export const RECURRENCE_CONFIDENCES = [
  "confirmed",
  "likely",
  "pattern",
] as const;

export const RECURRENCE_FREQUENCIES = [
  "annual",
  "irregular",
  "monthly",
  "quarterly",
  "weekly",
] as const;

/**
 * `fixed` is a commitment: same company, regular cadence, an amount that holds.
 * `behavioral` is a repeated purchase — the company recurs, the amount does not.
 */
export const RECURRENCE_KINDS = ["behavioral", "fixed"] as const;

export type RecurrenceConfidence = (typeof RECURRENCE_CONFIDENCES)[number];
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];
export type RecurrenceKind = (typeof RECURRENCE_KINDS)[number];

export interface RecurringItem {
  /** Amount dispersion over the median amount; 0 means identical every time. */
  amountSpread: number;
  category: SpendingCategory;
  confidence: RecurrenceConfidence;
  currency: string;
  frequency: RecurrenceFrequency;
  intervalDays: number;
  kind: RecurrenceKind;
  lastSeen: string;
  merchantKey: string;
  merchantName: string | null;
  nextExpected: string;
  occurrences: number;
  typicalAmountMinor: number;
}

/** One calendar month of outgoing spend, split by what recurs in it. */
export interface RecurringMonth {
  behavioralMinor: number;
  discretionaryMinor: number;
  fixedMinor: number;
  /** `YYYY-MM`, a 1-based calendar month. */
  month: string;
}

export interface RecurringData {
  /** When the server ran the detection; every projection counts from here. */
  asOf: string;
  availableBalanceMinor: number | null;
  currency: string;
  items: RecurringItem[];
  /** Trailing 12 calendar months, oldest first, zero-filled. */
  monthly: RecurringMonth[];
  monthlyIncomeMinor: number | null;
  plannedOutgoingMinor: number | null;
}

/** How far ahead the upcoming list and the KPI count look. */
export const UPCOMING_HORIZON_DAYS = 30;

/** "Due soon" for the insight that asks a reader to look at their balance. */
export const DUE_SOON_DAYS = 7;

export const FORECAST_HORIZON_DAYS = 30;

/** Months on each side of the recurring-cost trend comparison. */
export const TREND_WINDOW_MONTHS = 3;

/** Below this the trend reads as flat rather than as a direction. */
const TREND_FLAT_RATIO = 0.02;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Mean Gregorian month and year, so a cadence in days scales without drift. */
const DAYS_PER_MONTH = 365.25 / 12;
const DAYS_PER_YEAR = 365.25;

/**
 * A cadence cannot produce more occurrences than this inside a horizon. The
 * projection walks a loop over server-supplied intervals, so it needs a stop
 * that does not depend on them being sane.
 */
const MAX_PROJECTED_OCCURRENCES = 64;

/** A cadence of zero days would divide every derived cost by nothing. */
const cadenceDays = (item: RecurringItem): number =>
  item.intervalDays >= 1 ? item.intervalDays : 0;

/** Local midnight, so "days away" counts calendar days rather than hours. */
const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Calendar days from `from` to `to`; negative once `to` is behind it. */
export const dayDelta = (from: Date, to: Date): number =>
  Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY
  );

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);

/** What this payment costs in a month, whatever its cadence. */
export const monthlyEquivalentMinor = (item: RecurringItem): number => {
  const days = cadenceDays(item);
  return days === 0
    ? 0
    : Math.round((item.typicalAmountMinor * DAYS_PER_MONTH) / days);
};

/** What this payment costs in a year, whatever its cadence. */
export const annualCostMinor = (item: RecurringItem): number => {
  const days = cadenceDays(item);
  return days === 0
    ? 0
    : Math.round((item.typicalAmountMinor * DAYS_PER_YEAR) / days);
};

/**
 * The name to print. A bank that named nobody leaves only the lookup key, which
 * is the descriptor it did give — never translated, never blank.
 */
export const merchantLabel = (item: RecurringItem): string =>
  item.merchantName ?? item.merchantKey;

export interface UpcomingPayment {
  amountMinor: number;
  category: SpendingCategory;
  confidence: RecurrenceConfidence;
  currency: string;
  date: Date;
  /** Calendar days from `asOf`; 0 is today. */
  daysAway: number;
  id: string;
  kind: RecurrenceKind;
  label: string;
}

/**
 * Every occurrence expected inside the horizon, soonest first. A next date
 * already behind `asOf` is stepped forward: the bank may not have posted it
 * yet, and a list of what comes next must not open with last month.
 */
export const upcomingPayments = (
  items: RecurringItem[],
  asOf: Date,
  horizonDays: number = UPCOMING_HORIZON_DAYS
): UpcomingPayment[] => {
  const payments: UpcomingPayment[] = [];

  for (const item of items) {
    const days = cadenceDays(item);
    if (days === 0) {
      continue;
    }

    const expected = new Date(item.nextExpected);
    if (Number.isNaN(expected.getTime())) {
      continue;
    }

    let when = expected;
    let steps = 0;
    while (dayDelta(asOf, when) < 0 && steps < MAX_PROJECTED_OCCURRENCES) {
      when = addDays(when, days);
      steps += 1;
    }

    // The cap can end that loop before it catches up. An occurrence still
    // behind today is not upcoming, and emitting it would print "In -37 days".
    let offset = dayDelta(asOf, when);
    if (offset < 0) {
      continue;
    }

    let emitted = 0;
    while (offset <= horizonDays && emitted < MAX_PROJECTED_OCCURRENCES) {
      payments.push({
        amountMinor: item.typicalAmountMinor,
        category: item.category,
        confidence: item.confidence,
        currency: item.currency,
        date: when,
        daysAway: offset,
        id: `${item.merchantKey}@${offset}`,
        kind: item.kind,
        label: merchantLabel(item),
      });
      when = addDays(when, days);
      offset = dayDelta(asOf, when);
      emitted += 1;
    }
  }

  return payments.toSorted((a, b) => a.date.getTime() - b.date.getTime());
};

export interface RecurringSummary {
  /** Commitments, which is what a "left after recurring" figure can subtract. */
  activeCount: number;
  annualMinor: number;
  behavioralCount: number;
  /** Where the share's denominator came from, or `null` with neither. */
  denominatorKind: "income" | "plan" | null;
  denominatorMinor: number | null;
  dueSoonCount: number;
  monthlyMinor: number;
  remainingMinor: number | null;
  /** A ratio for `Intl.NumberFormat`'s percent style, or `null`. */
  share: number | null;
  upcomingCount: number;
  /** What those upcoming occurrences add up to. */
  upcomingMinor: number;
}

/**
 * The tab's headline figures. Commitments carry the cost totals: a "left after
 * recurring" figure that subtracted repeated groceries would answer a question
 * nobody asked. The counts cover both kinds, because both fall due.
 */
export const recurringSummary = (
  data: RecurringData,
  asOf: Date
): RecurringSummary => {
  let monthlyMinor = 0;
  let annualMinor = 0;
  let activeCount = 0;
  let behavioralCount = 0;

  for (const item of data.items) {
    if (item.kind === "fixed") {
      activeCount += 1;
      monthlyMinor += monthlyEquivalentMinor(item);
      annualMinor += annualCostMinor(item);
    } else {
      behavioralCount += 1;
    }
  }

  const upcoming = upcomingPayments(data.items, asOf);

  // A declared plan is what the reader chose to spend; observed income is the
  // fallback measurement. Zero on either side is no denominator at all.
  const plan = data.plannedOutgoingMinor;
  const income = data.monthlyIncomeMinor;
  let denominatorKind: "income" | "plan" | null = null;
  let denominatorMinor: number | null = null;
  if (plan !== null && plan > 0) {
    denominatorKind = "plan";
    denominatorMinor = plan;
  } else if (income !== null && income > 0) {
    denominatorKind = "income";
    denominatorMinor = income;
  }

  return {
    activeCount,
    annualMinor,
    behavioralCount,
    denominatorKind,
    denominatorMinor,
    dueSoonCount: upcoming.filter((p) => p.daysAway <= DUE_SOON_DAYS).length,
    monthlyMinor,
    remainingMinor:
      denominatorMinor === null ? null : denominatorMinor - monthlyMinor,
    share: denominatorMinor === null ? null : monthlyMinor / denominatorMinor,
    upcomingCount: upcoming.length,
    upcomingMinor: upcoming.reduce(
      (total, payment) => total + payment.amountMinor,
      0
    ),
  };
};

export interface RecurringCategoryRow {
  category: SpendingCategory;
  count: number;
  monthlyMinor: number;
}

/** Recurring cost a month per category, dearest first. Both kinds count. */
export const recurringByCategory = (
  items: RecurringItem[]
): RecurringCategoryRow[] => {
  const rows = new Map<SpendingCategory, RecurringCategoryRow>();

  for (const item of items) {
    const row = rows.get(item.category);
    const monthlyMinor = monthlyEquivalentMinor(item);
    if (row) {
      row.count += 1;
      row.monthlyMinor += monthlyMinor;
    } else {
      rows.set(item.category, {
        category: item.category,
        count: 1,
        monthlyMinor,
      });
    }
  }

  return [...rows.values()].toSorted((a, b) => b.monthlyMinor - a.monthlyMinor);
};

export interface FrequencyRow {
  annualMinor: number;
  category: SpendingCategory;
  id: string;
  kind: RecurrenceKind;
  label: string;
  /** Occurrences seen in the observed window. */
  occurrences: number;
  /** Occurrences a year implied by the cadence. */
  perYear: number;
}

const frequencyRow = (item: RecurringItem): FrequencyRow => {
  const days = cadenceDays(item);
  return {
    annualMinor: annualCostMinor(item),
    category: item.category,
    id: item.merchantKey,
    kind: item.kind,
    label: merchantLabel(item),
    occurrences: item.occurrences,
    perYear: days === 0 ? 0 : DAYS_PER_YEAR / days,
  };
};

/** The companies a reader deals with most often, by observed occurrences. */
export const purchaseFrequency = (
  items: RecurringItem[],
  limit = 8
): FrequencyRow[] =>
  items
    .map(frequencyRow)
    .toSorted(
      (a, b) => b.occurrences - a.occurrences || b.annualMinor - a.annualMinor
    )
    .slice(0, limit);

/** Every pattern as a point: how often against what it costs a year. */
export const frequencyCostPoints = (items: RecurringItem[]): FrequencyRow[] =>
  items.map(frequencyRow);

export interface ForecastPoint {
  /** Balance left once that day's payments have landed. */
  balanceMinor: number;
  date: Date;
  dueMinor: number;
  /** The companies due that day, for the tooltip. */
  labels: string[];
}

/**
 * The balance walked forward day by day as expected payments land. Empty when
 * no account reported a balance: a forecast from an unknown starting point is
 * a shape, not a figure.
 */
export const forecastSeries = (
  data: RecurringData,
  asOf: Date,
  horizonDays: number = FORECAST_HORIZON_DAYS
): ForecastPoint[] => {
  if (data.availableBalanceMinor === null) {
    return [];
  }

  const dueByDay = new Map<number, { labels: string[]; minor: number }>();
  for (const payment of upcomingPayments(data.items, asOf, horizonDays)) {
    const day = dueByDay.get(payment.daysAway);
    if (day) {
      day.labels.push(payment.label);
      day.minor += payment.amountMinor;
    } else {
      dueByDay.set(payment.daysAway, {
        labels: [payment.label],
        minor: payment.amountMinor,
      });
    }
  }

  const points: ForecastPoint[] = [];
  const start = startOfDay(asOf);
  let balanceMinor = data.availableBalanceMinor;

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const day = dueByDay.get(offset);
    const dueMinor = day?.minor ?? 0;
    balanceMinor -= dueMinor;
    points.push({
      balanceMinor,
      date: addDays(start, offset),
      dueMinor,
      labels: day?.labels ?? [],
    });
  }

  return points;
};

export interface SpendSplit {
  behavioralMinor: number;
  discretionaryMinor: number;
  fixedMinor: number;
}

/** The observed window's outgoing spend, split three ways. */
export const spendSplit = (monthly: RecurringMonth[]): SpendSplit => {
  const split: SpendSplit = {
    behavioralMinor: 0,
    discretionaryMinor: 0,
    fixedMinor: 0,
  };

  for (const month of monthly) {
    split.behavioralMinor += month.behavioralMinor;
    split.discretionaryMinor += month.discretionaryMinor;
    split.fixedMinor += month.fixedMinor;
  }

  return split;
};

export interface RecurringSection {
  items: RecurringItem[];
  kind: RecurrenceKind;
  monthlyMinor: number;
}

/** Mean of a non-empty numeric series; `NaN` on an empty one. */
const mean = (values: number[]): number => {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total / values.length;
};

/**
 * Commitments and patterns as two sections, always both, always in that order:
 * a predicted habit must never sit in the same run of rows as a confirmed
 * direct debit.
 */
export const recurringSections = (
  items: RecurringItem[]
): [RecurringSection, RecurringSection] => {
  const section = (kind: RecurrenceKind): RecurringSection => {
    const own = items
      .filter((item) => item.kind === kind)
      .toSorted(
        (a, b) => monthlyEquivalentMinor(b) - monthlyEquivalentMinor(a)
      );
    let monthlyMinor = 0;
    for (const item of own) {
      monthlyMinor += monthlyEquivalentMinor(item);
    }
    return { items: own, kind, monthlyMinor };
  };

  return [section("fixed"), section("behavioral")];
};

export interface RecurringTrend {
  direction: "down" | "flat" | "up";
  /** Signed change against the earlier window, as a ratio. */
  ratio: number;
}

/**
 * How recurring cost moved between the last two windows of whole months. The
 * final entry is the month in progress and is dropped: comparing a part month
 * against whole ones reports a collapse that never happened.
 *
 * A month with nothing outgoing at all is a month before the history begins,
 * because the series counts discretionary spend too. It is zero-filled rather
 * than measured, and averaging it in fabricates a rise.
 */
export const recurringTrend = (
  monthly: RecurringMonth[],
  window: number = TREND_WINDOW_MONTHS
): RecurringTrend | null => {
  const whole = monthly.slice(0, -1);
  const compared = whole.slice(-window * 2);
  if (
    compared.length < window * 2 ||
    compared.some(
      (m) => m.behavioralMinor + m.discretionaryMinor + m.fixedMinor === 0
    )
  ) {
    return null;
  }

  const recurring = compared.map((m) => m.behavioralMinor + m.fixedMinor);

  const recent = mean(recurring.slice(-window));
  const prior = mean(recurring.slice(0, window));
  if (prior === 0) {
    return null;
  }

  const ratio = (recent - prior) / prior;
  if (Math.abs(ratio) < TREND_FLAT_RATIO) {
    return { direction: "flat", ratio: 0 };
  }
  return { direction: ratio > 0 ? "up" : "down", ratio };
};

export type RecurringInsight =
  | { annualMinor: number; kind: "top-annual"; label: string }
  | { count: number; days: number; kind: "due-soon" }
  | { denominator: "income" | "plan"; kind: "share"; share: number }
  | { kind: "trend"; trend: RecurringTrend };

/**
 * What the figures above are worth saying out loud, most actionable first: what
 * lands this week, where the cost is going, what share it takes, and the single
 * dearest commitment.
 */
export const recurringInsights = (
  data: RecurringData,
  asOf: Date
): RecurringInsight[] => {
  const insights: RecurringInsight[] = [];
  const summary = recurringSummary(data, asOf);

  if (summary.dueSoonCount > 0) {
    insights.push({
      count: summary.dueSoonCount,
      days: DUE_SOON_DAYS,
      kind: "due-soon",
    });
  }

  const trend = recurringTrend(data.monthly);
  if (trend) {
    insights.push({ kind: "trend", trend });
  }

  if (summary.denominatorKind !== null && summary.share !== null) {
    insights.push({
      denominator: summary.denominatorKind,
      kind: "share",
      share: summary.share,
    });
  }

  let dearest: RecurringItem | null = null;
  for (const item of data.items) {
    if (
      item.kind === "fixed" &&
      (dearest === null || annualCostMinor(item) > annualCostMinor(dearest))
    ) {
      dearest = item;
    }
  }
  if (dearest) {
    insights.push({
      annualMinor: annualCostMinor(dearest),
      kind: "top-annual",
      label: merchantLabel(dearest),
    });
  }

  return insights;
};

/** A `YYYY-MM` key as a short month name for a chart axis. */
export const monthKeyLabel = (month: string, locale: Locale): string => {
  const [year, index] = month.split("-").map(Number);
  if (Number.isNaN(year) || Number.isNaN(index)) {
    return month;
  }
  return new Date(year, index - 1, 1).toLocaleDateString(locale, {
    month: "short",
  });
};

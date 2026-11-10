import type { SpendingCategory } from "@freenary/api/lib/taxonomy";

import { upcomingPayments } from "@/entities/recurring";
import type { RecurringData, UpcomingPayment } from "@/entities/recurring";
import { dayDelta } from "@/shared/lib/calendar-day";

export interface MonthRange {
  from: Date;
  to: Date;
}

export interface PacePoint {
  currentMinor: number;
  day: number;
  previousMinor: number;
}

export interface SpendingPace {
  currentToDateMinor: number;
  monthTotalMinor: number;
  points: PacePoint[];
  previousMonthTotalMinor: number;
  previousToDateMinor: number;
}

export interface AvailableToSpend {
  availableMinor: number;
  balanceMinor: number;
  billCount: number;
  billsMinor: number;
  monthEnd: Date;
}

export interface CategoryShare {
  amountMinor: number;
  category: SpendingCategory;
  share: number;
}

interface CashFlowPeriod {
  label: string;
  outgoing: number;
}

const LAST_DAY_OF_PREVIOUS_MONTH = 0;
const END_OF_DAY = { hours: 23, milliseconds: 999, minutes: 59, seconds: 59 };
const DAY_OF_MONTH_START = 8;
const DAY_OF_MONTH_END = 10;

export const UPCOMING_WINDOW_DAYS = 14;
export const UPCOMING_ROWS_SHOWN = 5;
export const TOP_CATEGORIES_SHOWN = 4;

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month + 1, LAST_DAY_OF_PREVIOUS_MONTH)).getUTCDate();

const monthRange = (year: number, month: number): MonthRange => ({
  from: new Date(Date.UTC(year, month, 1)),
  to: new Date(
    Date.UTC(
      year,
      month + 1,
      LAST_DAY_OF_PREVIOUS_MONTH,
      END_OF_DAY.hours,
      END_OF_DAY.minutes,
      END_OF_DAY.seconds,
      END_OF_DAY.milliseconds
    )
  ),
});

export const dashboardMonths = (today: Date) => ({
  current: monthRange(today.getFullYear(), today.getMonth()),
  previous: monthRange(today.getFullYear(), today.getMonth() - 1),
});

const runningTotals = (periods: CashFlowPeriod[], days: number): number[] => {
  const byDay = Array.from({ length: days }, () => 0);

  for (const period of periods) {
    const day = Number(
      period.label.slice(DAY_OF_MONTH_START, DAY_OF_MONTH_END)
    );

    if (day >= 1 && day <= days) {
      byDay[day - 1] = (byDay[day - 1] ?? 0) + period.outgoing;
    }
  }

  let total = 0;

  return byDay.map((amount) => {
    total += amount;

    return total;
  });
};

export const spendingPace = (
  current: CashFlowPeriod[],
  previous: CashFlowPeriod[],
  today: Date
): SpendingPace => {
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentDays = daysInMonth(year, month);
  const previousDays = daysInMonth(year, month - 1);
  const currentTotals = runningTotals(current, currentDays);
  const previousTotals = runningTotals(previous, previousDays);
  const dayOfMonth = today.getDate();

  const previousAt = (day: number) =>
    previousTotals[Math.min(day, previousDays) - 1] ?? 0;

  const points = Array.from({ length: dayOfMonth }, (_, index) => ({
    currentMinor: currentTotals[index] ?? 0,
    day: index + 1,
    previousMinor: previousAt(index + 1),
  }));

  return {
    currentToDateMinor: currentTotals[dayOfMonth - 1] ?? 0,
    monthTotalMinor: currentTotals.at(-1) ?? 0,
    points,
    previousMonthTotalMinor: previousTotals.at(-1) ?? 0,
    previousToDateMinor: previousAt(dayOfMonth),
  };
};

export const commitmentsDue = (
  recurring: RecurringData,
  today: Date,
  horizonDays: number
): UpcomingPayment[] =>
  upcomingPayments(
    recurring.items.filter((item) => item.kind === "fixed"),
    today,
    horizonDays
  );

export const availableToSpend = (
  recurring: RecurringData,
  today: Date
): AvailableToSpend | null => {
  const balanceMinor = recurring.availableBalanceMinor;

  if (balanceMinor === null) {
    return null;
  }

  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const bills = commitmentsDue(
    recurring,
    today,
    dayDelta(today, monthEnd)
  ).filter((payment) => payment.currency === recurring.currency);

  const billsMinor = bills.reduce(
    (total, payment) => total + payment.amountMinor,
    0
  );

  return {
    availableMinor: balanceMinor - billsMinor,
    balanceMinor,
    billCount: bills.length,
    billsMinor,
    monthEnd,
  };
};

export const topCategories = (
  categories: { amount: number; category: SpendingCategory }[],
  count: number
): CategoryShare[] => {
  const total = categories.reduce((sum, category) => sum + category.amount, 0);

  if (total <= 0) {
    return [];
  }

  return categories
    .filter((category) => category.amount > 0)
    .toSorted((a, b) => b.amount - a.amount)
    .slice(0, count)
    .map((category) => ({
      amountMinor: category.amount,
      category: category.category,
      share: category.amount / total,
    }));
};

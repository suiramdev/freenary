import { z } from "zod";

export interface BudgetMonth {
  month: number;
  year: number;
}

export interface BudgetMonthRange {
  from: Date;
  to: Date;
}

export const DEFAULT_BUDGET_MONTH_START_DAY = 1;

export const MAX_BUDGET_MONTH_START_DAY = 28;

export const budgetMonthStartDaySchema = z
  .number()
  .int()
  .min(DEFAULT_BUDGET_MONTH_START_DAY)
  .max(MAX_BUDGET_MONTH_START_DAY);

const LAST_START_DAY_INSIDE_ITS_MONTH = 15;

const MONTHS_IN_A_YEAR = 12;

const startsInThePreviousMonth = (startDay: number): boolean =>
  startDay > LAST_START_DAY_INSIDE_ITS_MONTH;

const normalised = (year: number, month: number): BudgetMonth => {
  const absolute = year * MONTHS_IN_A_YEAR + month;

  return {
    month:
      ((absolute % MONTHS_IN_A_YEAR) + MONTHS_IN_A_YEAR) % MONTHS_IN_A_YEAR,
    year: Math.floor(absolute / MONTHS_IN_A_YEAR),
  };
};

export const shiftBudgetMonth = (
  { month, year }: BudgetMonth,
  months: number
): BudgetMonth => normalised(year, month + months);

export const budgetMonthRange = (
  { month, year }: BudgetMonth,
  startDay: number
): BudgetMonthRange => {
  const startMonth = startsInThePreviousMonth(startDay) ? month - 1 : month;

  return {
    from: new Date(Date.UTC(year, startMonth, startDay)),
    to: new Date(Date.UTC(year, startMonth + 1, startDay) - 1),
  };
};

export const budgetMonthsRange = (
  last: BudgetMonth,
  count: number,
  startDay: number
): BudgetMonthRange => ({
  from: budgetMonthRange(shiftBudgetMonth(last, 1 - count), startDay).from,
  to: budgetMonthRange(last, startDay).to,
});

export const budgetMonthOfDay = (
  day: { date: number; month: number; year: number },
  startDay: number
): BudgetMonth => {
  const startedIn = day.date >= startDay ? day.month : day.month - 1;

  return normalised(
    day.year,
    startsInThePreviousMonth(startDay) ? startedIn + 1 : startedIn
  );
};

export const budgetMonthOfBankDate = (
  date: Date,
  startDay: number
): BudgetMonth =>
  budgetMonthOfDay(
    {
      date: date.getUTCDate(),
      month: date.getUTCMonth(),
      year: date.getUTCFullYear(),
    },
    startDay
  );

export const budgetMonthKey = ({ month, year }: BudgetMonth): string =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

export const budgetMonthKeysBetween = (
  from: Date,
  to: Date,
  startDay: number
): string[] => {
  const keys: string[] = [];
  const last = budgetMonthOfBankDate(to, startDay);
  let cursor = budgetMonthOfBankDate(from, startDay);

  while (
    cursor.year < last.year ||
    (cursor.year === last.year && cursor.month <= last.month)
  ) {
    keys.push(budgetMonthKey(cursor));
    cursor = shiftBudgetMonth(cursor, 1);
  }

  return keys;
};

export const isCalendarBudgetMonth = (startDay: number): boolean =>
  startDay === DEFAULT_BUDGET_MONTH_START_DAY;

export const budgetMonthBucketShift = (
  startDay: number
): { days: number; months: number } => ({
  days: startDay - 1,
  months: startsInThePreviousMonth(startDay) ? 1 : 0,
});

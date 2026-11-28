import type { AggregationMode } from "./aggregation";
import {
  outgoingByCategory,
  periodRows,
  sankeyOf,
  spendingBreakdownOf,
  userOutgoingByCategory,
} from "./budget-aggregates";
import {
  budgetMonthOfBankDate,
  budgetMonthRange,
  shiftBudgetMonth,
} from "./budget-month";
import type { BudgetMonthRule } from "./budget-month";
import type { SpendingCategory } from "./taxonomy";
import { userBudgetMonthRule } from "./user-budget-month";
import { userConverter } from "./user-currency";

/** A change is only shown when it is at least this large in minor units. */
export const MIN_PERIOD_CHANGE_MINOR = 100;

/** A change is only shown when it is at least this large in percent. */
export const MIN_PERIOD_CHANGE_PERCENT = 1;

export interface PeriodChange {
  differenceMinor: number;
  hasPreviousData: boolean;
  percent: number | null;
  show: boolean;
}

export const periodChangeOf = (
  currentMinor: number,
  previousMinor: number,
): PeriodChange => {
  const differenceMinor = currentMinor - previousMinor;
  const hasPreviousData = previousMinor !== 0;
  const percent = hasPreviousData
    ? (differenceMinor / Math.abs(previousMinor)) * 100
    : null;
  const show =
    hasPreviousData &&
    percent !== null &&
    Math.abs(differenceMinor) >= MIN_PERIOD_CHANGE_MINOR &&
    Math.abs(percent) >= MIN_PERIOD_CHANGE_PERCENT;
  return { differenceMinor, hasPreviousData, percent, show };
};

export interface PreviousPeriod {
  from: Date;
  isBudgetMonth: boolean;
  to: Date;
}

/**
 * The period to compare against: the previous budget month when the given
 * range is exactly one budget month, otherwise the range of the same length
 * immediately before it.
 */
export const previousPeriodOf = (
  from: Date,
  to: Date,
  rule: BudgetMonthRule,
): PreviousPeriod => {
  const month = budgetMonthOfBankDate(from, rule);
  const range = budgetMonthRange(month, rule);
  if (
    range.from.getTime() === from.getTime() &&
    range.to.getTime() === to.getTime()
  ) {
    const previousRange = budgetMonthRange(shiftBudgetMonth(month, -1), rule);
    return { from: previousRange.from, isBudgetMonth: true, to: previousRange.to };
  }
  const lengthMs = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - lengthMs + 1);
  return { from: previousFrom, isBudgetMonth: false, to: previousTo };
};

export interface CategoryComparison<C extends string = string> {
  amount: number;
  category: C;
  change: PeriodChange;
  previousAmount: number;
}

export const withPreviousCategories = <C extends string>(
  current: readonly { amount: number; category: C }[],
  previous: readonly { amount: number; category: C }[],
): CategoryComparison<C>[] => {
  const previousByCategory = new Map(
    previous.map((row) => [row.category, row.amount]),
  );
  return current.map((row) => {
    const previousAmount = previousByCategory.get(row.category) ?? 0;
    return {
      amount: row.amount,
      category: row.category,
      change: periodChangeOf(row.amount, previousAmount),
      previousAmount,
    };
  });
};

export interface PreviousPeriodSummary extends PreviousPeriod {
  totalExpensesMinor: number;
  totalIncomeMinor: number;
}

export interface PeriodComparison {
  categories: CategoryComparison<SpendingCategory>[];
  changes: {
    expenses: PeriodChange;
    income: PeriodChange;
    net: PeriodChange;
  };
  summary: PreviousPeriodSummary;
}

/**
 * Compare a period against its previous period, using the same rules as the
 * period itself: the member's budget month, the same exclusions and internal
 * transfer handling (via periodRows), and the reporting currency (via a
 * converter for the previous range).
 */
export const previousPeriodComparisonOf = async (
  userId: string,
  rows: Parameters<typeof sankeyOf>[0],
  period: {
    aggregation: AggregationMode;
    from: Date;
    rule: BudgetMonthRule;
    to: Date;
  },
): Promise<PeriodComparison> => {
  const currentSankey = sankeyOf(rows, period);
  const currentOutgoing = rows.filter((row) => row.amount < 0);
  const currentCategories = spendingBreakdownOf(
    outgoingByCategory(currentOutgoing, period),
  ).categories;
  const previous = previousPeriodOf(period.from, period.to, period.rule);
  const converter = await userConverter(userId, previous.from, previous.to);
  const previousRows = await periodRows(
    userId,
    previous.from,
    previous.to,
    converter,
  );
  const previousPeriod = { ...period, from: previous.from, to: previous.to };
  const previousSankey = sankeyOf(previousRows.rows, previousPeriod);
  const previousOutgoing = previousRows.rows.filter((row) => row.amount < 0);
  const previousCategories = spendingBreakdownOf(
    outgoingByCategory(previousOutgoing, previousPeriod),
  ).categories;
  return {
    categories: withPreviousCategories(currentCategories, previousCategories),
    changes: {
      expenses: periodChangeOf(
        currentSankey.totalExpenses,
        previousSankey.totalExpenses,
      ),
      income: periodChangeOf(
        currentSankey.totalIncome,
        previousSankey.totalIncome,
      ),
      net: periodChangeOf(
        currentSankey.totalIncome - currentSankey.totalExpenses,
        previousSankey.totalIncome - previousSankey.totalExpenses,
      ),
    },
    summary: {
      ...previous,
      totalExpensesMinor: previousSankey.totalExpenses,
      totalIncomeMinor: previousSankey.totalIncome,
    },
  };
};

export const previousSpendingBreakdownOf = async (
  userId: string,
  period: { aggregation: AggregationMode; from: Date; to: Date },
  currentCategories: readonly {
    amount: number;
    category: SpendingCategory;
  }[],
): Promise<{
  categories: CategoryComparison<SpendingCategory>[];
  summary: PreviousPeriod;
}> => {
  const rule = await userBudgetMonthRule(userId);
  const previous = previousPeriodOf(period.from, period.to, rule);
  const converter = await userConverter(userId, previous.from, previous.to);
  const outgoing = await userOutgoingByCategory(
    userId,
    { aggregation: period.aggregation, from: previous.from, to: previous.to },
    converter,
  );
  const previousCategories = spendingBreakdownOf(outgoing.byCategory).categories;
  return {
    categories: withPreviousCategories(currentCategories, previousCategories),
    summary: previous,
  };
};

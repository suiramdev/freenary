import { describe, expect, test } from "bun:test";
import { budgetMonthRange } from "./budget-month";
import {
  periodChangeOf,
  previousPeriodOf,
  withPreviousCategories,
} from "./previous-period";

const calendarRule = { kind: "calendar", startDay: 1 } as const;
const startDayRule = { kind: "start-day", startDay: 25 } as const;

describe("previousPeriodOf", () => {
  test("a budget month compares against the previous budget month", () => {
    const november = budgetMonthRange({ month: 11, year: 2026 }, calendarRule);
    const october = budgetMonthRange({ month: 10, year: 2026 }, calendarRule);
    expect(previousPeriodOf(november.from, november.to, calendarRule)).toEqual({
      from: october.from,
      isBudgetMonth: true,
      to: october.to,
    });
  });

  test("a budget month with a custom start day compares against the previous one", () => {
    const november = budgetMonthRange({ month: 11, year: 2026 }, startDayRule);
    const october = budgetMonthRange({ month: 10, year: 2026 }, startDayRule);
    expect(previousPeriodOf(november.from, november.to, startDayRule)).toEqual({
      from: october.from,
      isBudgetMonth: true,
      to: october.to,
    });
  });

  test("a custom range compares against the same-length range just before it", () => {
    const from = new Date("2026-11-10T00:00:00.000Z");
    const to = new Date("2026-11-19T23:59:59.999Z");
    expect(previousPeriodOf(from, to, calendarRule)).toEqual({
      from: new Date("2026-10-31T00:00:00.000Z"),
      isBudgetMonth: false,
      to: new Date("2026-11-09T23:59:59.999Z"),
    });
  });
});

describe("periodChangeOf", () => {
  test("reports the signed difference and percent", () => {
    const change = periodChangeOf(214_000, 191_000);
    expect(change.differenceMinor).toBe(23_000);
    expect(change.percent).toBeCloseTo(12.04, 2);
    expect(change.hasPreviousData).toBe(true);
    expect(change.show).toBe(true);
  });

  test("shows no change when the previous period has no data", () => {
    const change = periodChangeOf(214_000, 0);
    expect(change.hasPreviousData).toBe(false);
    expect(change.percent).toBeNull();
    expect(change.show).toBe(false);
  });

  test("hides changes smaller than one euro", () => {
    expect(periodChangeOf(10_050, 10_000).show).toBe(false);
    expect(periodChangeOf(10_090, 10_000).show).toBe(false);
  });

  test("hides changes smaller than one percent", () => {
    expect(periodChangeOf(10_050, 10_000).show).toBe(false);
    expect(periodChangeOf(10_100, 10_000).show).toBe(true);
  });
});

describe("withPreviousCategories", () => {
  test("attaches the previous amount and change to each current category", () => {
    const compared = withPreviousCategories(
      [
        { amount: 50_000, category: "groceries" },
        { amount: 20_000, category: "transport" },
        { amount: 5_000, category: "entertainment" },
      ],
      [
        { amount: 40_000, category: "groceries" },
        { amount: 30_000, category: "transport" },
        { amount: 9_999, category: "housing" },
      ],
    );
    expect(compared).toHaveLength(3);
    expect(compared[0]).toMatchObject({
      amount: 50_000,
      category: "groceries",
      previousAmount: 40_000,
    });
    expect(compared[0]?.change.differenceMinor).toBe(10_000);
    expect(compared[0]?.change.show).toBe(true);
    expect(compared[1]?.change.differenceMinor).toBe(-10_000);
    expect(compared[1]?.change.percent).toBeCloseTo(-33.33, 2);
    expect(compared[1]?.change.show).toBe(true);
    expect(compared[2]).toMatchObject({
      amount: 5_000,
      category: "entertainment",
      previousAmount: 0,
    });
    expect(compared[2]?.change.show).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";

import {
  budgetMonthBucketShift,
  budgetMonthKey,
  budgetMonthKeysBetween,
  budgetMonthOfBankDate,
  budgetMonthOfDay,
  budgetMonthRange,
  budgetMonthsRange,
  budgetMonthStartDaySchema,
  shiftBudgetMonth,
} from "./budget-month";

const JANUARY = 0;
const FEBRUARY = 1;
const MARCH = 2;
const DECEMBER = 11;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("budgetMonthRange", () => {
  test("is the calendar month when the month starts on the 1st", () => {
    const { from, to } = budgetMonthRange({ month: FEBRUARY, year: 2026 }, 1);

    expect(from.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  test("starts in the named month up to the 15th", () => {
    const { from, to } = budgetMonthRange({ month: JANUARY, year: 2026 }, 5);

    expect(from.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-02-04T23:59:59.999Z");
  });

  test("starts in the month before from the 16th, so a salary paid on the 28th funds the next month", () => {
    const { from, to } = budgetMonthRange({ month: FEBRUARY, year: 2026 }, 28);

    expect(from.toISOString()).toBe("2026-01-28T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-02-27T23:59:59.999Z");
  });

  test("crosses the year boundary", () => {
    const { from, to } = budgetMonthRange({ month: JANUARY, year: 2026 }, 25);

    expect(from.toISOString()).toBe("2025-12-25T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-01-24T23:59:59.999Z");
  });
});

describe("budgetMonthOfDay", () => {
  test("places every day of a period in the month that names it", () => {
    for (const startDay of [1, 5, 15, 16, 25, 28]) {
      const month = { month: MARCH, year: 2026 };
      const { from, to } = budgetMonthRange(month, startDay);

      expect(budgetMonthOfBankDate(from, startDay)).toEqual(month);
      expect(budgetMonthOfBankDate(to, startDay)).toEqual(month);
    }
  });

  test("moves a salary paid on the 28th of December to January", () => {
    expect(budgetMonthOfBankDate(day("2025-12-28"), 25)).toEqual({
      month: JANUARY,
      year: 2026,
    });
  });

  test("keeps a day before the start in the previous period", () => {
    expect(
      budgetMonthOfDay({ date: 4, month: JANUARY, year: 2026 }, 5)
    ).toEqual({ month: DECEMBER, year: 2025 });
  });
});

describe("budgetMonthsRange", () => {
  test("spans several budget months ending on the given one", () => {
    const { from, to } = budgetMonthsRange(
      { month: FEBRUARY, year: 2026 },
      3,
      25
    );

    expect(from.toISOString()).toBe("2025-11-25T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-02-24T23:59:59.999Z");
  });
});

describe("budgetMonthKeysBetween", () => {
  test("lists each budget month a range touches", () => {
    const { from, to } = budgetMonthsRange(
      { month: JANUARY, year: 2026 },
      3,
      28
    );

    expect(budgetMonthKeysBetween(from, to, 28)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });
});

describe("shiftBudgetMonth and budgetMonthKey", () => {
  test("wrap around the year", () => {
    expect(
      budgetMonthKey(shiftBudgetMonth({ month: JANUARY, year: 2026 }, -1))
    ).toBe("2025-12");

    expect(
      budgetMonthKey(shiftBudgetMonth({ month: DECEMBER, year: 2025 }, 2))
    ).toBe("2026-02");
  });
});

describe("budgetMonthBucketShift", () => {
  test("leaves calendar months alone", () => {
    expect(budgetMonthBucketShift(1)).toEqual({ days: 0, months: 0 });
  });

  test("names a period that starts after the 15th by the next month", () => {
    expect(budgetMonthBucketShift(5)).toEqual({ days: 4, months: 0 });
    expect(budgetMonthBucketShift(28)).toEqual({ days: 27, months: 1 });
  });
});

describe("budgetMonthStartDaySchema", () => {
  test("accepts the 1st to the 28th only", () => {
    expect(budgetMonthStartDaySchema.safeParse(1).success).toBe(true);
    expect(budgetMonthStartDaySchema.safeParse(28).success).toBe(true);
    expect(budgetMonthStartDaySchema.safeParse(0).success).toBe(false);
    expect(budgetMonthStartDaySchema.safeParse(29).success).toBe(false);
    expect(budgetMonthStartDaySchema.safeParse(1.5).success).toBe(false);
  });
});

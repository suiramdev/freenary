import { describe, expect, test } from "bun:test";

import { monthSpan, periodMonthCount, plannedByGroup } from "./budget-planned";
import { CATEGORY_GROUP_OF } from "./taxonomy";

const line = (
  amount: number,
  categorySlug: string | null,
  parentSlug: string | null = null
) => ({ amount, categorySlug, parentSlug });

describe("plannedByGroup", () => {
  test("maps a predefined slug to its taxonomy group", () => {
    const planned = plannedByGroup([line(120_000, "rent")], 1);
    expect(planned.get(CATEGORY_GROUP_OF.rent)).toBe(120_000);
    expect(planned.size).toBe(1);
  });

  test("maps a custom category to its parent group", () => {
    const planned = plannedByGroup([line(4500, null, "leisure")], 1);
    expect(planned.get("leisure")).toBe(4500);
  });

  test("falls back to other for a custom category with no usable parent", () => {
    const planned = plannedByGroup(
      [line(1000, null, null), line(500, null, "not-a-group")],
      1
    );
    expect(planned.get("other")).toBe(1500);
    expect(planned.size).toBe(1);
  });

  test("sums several lines landing in the same group", () => {
    const planned = plannedByGroup(
      [line(90_000, "rent"), line(1500, "home-insurance")],
      1
    );
    expect(CATEGORY_GROUP_OF["home-insurance"]).toBe(CATEGORY_GROUP_OF.rent);
    expect(planned.get(CATEGORY_GROUP_OF.rent)).toBe(91_500);
  });

  test("multiplies monthly amounts by the month count", () => {
    const planned = plannedByGroup(
      [line(2000, "water"), line(3000, "water")],
      3
    );
    expect(planned.get(CATEGORY_GROUP_OF.water)).toBe(15_000);
  });

  test("yields an empty map for no lines", () => {
    expect(plannedByGroup([], 12).size).toBe(0);
  });
});

describe("monthSpan", () => {
  test("counts one month for a single-month range", () => {
    expect(
      monthSpan(new Date(2026, 8, 1), new Date(2026, 8, 30, 23, 59, 59, 999))
    ).toBe(1);
    expect(
      monthSpan(new Date(2026, 1, 1), new Date(2026, 1, 28, 23, 59, 59, 999))
    ).toBe(1);
  });

  test("counts the months of a longer range", () => {
    expect(
      monthSpan(new Date(2026, 6, 1), new Date(2026, 8, 30, 23, 59, 59, 999))
    ).toBe(3);
    expect(
      monthSpan(new Date(2025, 9, 1), new Date(2026, 8, 30, 23, 59, 59, 999))
    ).toBe(12);
  });

  test("ignores the client's timezone offset on the boundaries", () => {
    // A UTC+2 client sends 2026-08-31T22:00Z … 2026-09-30T21:59Z for September.
    const from = new Date("2026-08-31T22:00:00.000Z");
    const to = new Date("2026-09-30T21:59:59.999Z");
    expect(monthSpan(from, to)).toBe(1);
  });
});

describe("periodMonthCount", () => {
  const now = new Date(2026, 8, 15, 12, 0, 0);

  test("leaves a finished month at its own span", () => {
    expect(
      periodMonthCount(
        new Date(2026, 7, 1),
        new Date(2026, 7, 31, 23, 59, 59, 999),
        now
      )
    ).toBe(1);
  });

  test("leaves a finished three-month range at three", () => {
    expect(
      periodMonthCount(
        new Date(2026, 4, 1),
        new Date(2026, 6, 31, 23, 59, 59, 999),
        now
      )
    ).toBe(3);
  });

  test("leaves a finished calendar year at twelve", () => {
    expect(
      periodMonthCount(
        new Date(2025, 0, 1),
        new Date(2025, 11, 31, 23, 59, 59, 999),
        now
      )
    ).toBe(12);
  });

  test("scales the running calendar year to its elapsed months", () => {
    expect(
      periodMonthCount(
        new Date(2026, 0, 1),
        new Date(2026, 11, 31, 23, 59, 59, 999),
        now
      )
    ).toBe(8);
  });

  test("floors a period that has not started at one month", () => {
    expect(
      periodMonthCount(
        new Date(2027, 0, 1),
        new Date(2027, 11, 31, 23, 59, 59, 999),
        now
      )
    ).toBe(1);
  });
});

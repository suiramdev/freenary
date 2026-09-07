import { describe, expect, test } from "bun:test";

import type { AmountBoundsCondition } from "./transaction-amount-bounds";
import { amountBoundsCondition } from "./transaction-amount-bounds";

/** One comparison Prisma would send, keyed by its operator. */
type Comparison = Record<string, number>;

/** What Postgres would answer for one row, read off the generated filter. */
const matches = (
  condition: NonNullable<AmountBoundsCondition>,
  amount: number
): boolean => {
  // SAFETY: the helper's only shape is `OR` over two `amount` comparisons, and
  // every test below throws before this line if it returned nothing.
  const branches = condition.OR as { amount: Comparison }[];
  return branches.some(({ amount: bound }) =>
    Object.entries(bound).every(([op, value]) => {
      switch (op) {
        case "gt": {
          return amount > value;
        }
        case "gte": {
          return amount >= value;
        }
        case "lt": {
          return amount < value;
        }
        default: {
          return amount <= value;
        }
      }
    })
  );
};

describe("transaction amount bounds", () => {
  test("no bound is no condition", () => {
    expect(amountBoundsCondition()).toBeNull();
  });

  test("a ceiling alone keeps only the amounts under it, either way", () => {
    const condition = amountBoundsCondition(undefined, 3000);
    if (!condition) {
      throw new Error("expected a condition");
    }

    expect(matches(condition, -2000)).toBe(true);
    expect(matches(condition, 2000)).toBe(true);
    expect(matches(condition, -7150)).toBe(false);
    expect(matches(condition, 7150)).toBe(false);
  });

  test("a floor alone keeps only the amounts over it, either way", () => {
    const condition = amountBoundsCondition(5000);
    if (!condition) {
      throw new Error("expected a condition");
    }

    expect(matches(condition, -7150)).toBe(true);
    expect(matches(condition, 7150)).toBe(true);
    expect(matches(condition, -2000)).toBe(false);
    expect(matches(condition, 2000)).toBe(false);
  });

  test("both bounds keep the span, inclusive", () => {
    const condition = amountBoundsCondition(4000, 8000);
    if (!condition) {
      throw new Error("expected a condition");
    }

    expect(matches(condition, -4000)).toBe(true);
    expect(matches(condition, -8000)).toBe(true);
    expect(matches(condition, 6000)).toBe(true);
    expect(matches(condition, -3999)).toBe(false);
    expect(matches(condition, 8001)).toBe(false);
  });

  test("a floor above the ceiling matches nothing", () => {
    const condition = amountBoundsCondition(9000, 100);
    if (!condition) {
      throw new Error("expected a condition");
    }

    expect(matches(condition, -5000)).toBe(false);
    expect(matches(condition, 5000)).toBe(false);
  });
});

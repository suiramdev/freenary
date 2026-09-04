import { describe, expect, it } from "bun:test";

import type { RecurrenceTransaction, RecurringExpense } from "./recurrence";
import { cadenceWindow, recurringInWindow } from "./recurrence";

describe("RecurringExpense", () => {
  it("defines the expected shape", () => {
    const expense: RecurringExpense = {
      category: "energy",
      currency: "EUR",
      frequency: "monthly",
      intervalDays: 30,
      lastSeen: new Date(),
      merchantKey: "edf",
      merchantName: "EDF",
      nextExpected: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      occurrences: 12,
      typicalAmountMinor: 8500,
    };
    expect(expense.frequency).toBe("monthly");
    expect(expense.intervalDays).toBe(30);
    expect(expense.occurrences).toBe(12);
  });

  it("supports all frequency values", () => {
    const frequencies: RecurringExpense["frequency"][] = [
      "weekly",
      "monthly",
      "quarterly",
      "annual",
      "irregular",
    ];
    expect(frequencies).toHaveLength(5);
  });
});

const WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const monthlySeries = (
  merchantKey: string,
  first: Date,
  occurrences: number
): RecurrenceTransaction[] =>
  Array.from({ length: occurrences }, (_, index) => ({
    amount: -1500,
    category: "energy",
    counterpartyName: merchantKey,
    currency: "EUR",
    date: new Date(first.getFullYear(), first.getMonth() + index, 5),
    merchantKey,
    resolvedCategory: null,
  }));

describe("recurringInWindow", () => {
  const asOf = new Date(2026, 8, 15);
  const window = { from: new Date(asOf.getTime() - WINDOW_MS), to: asOf };

  it("detects a merchant recurring inside the window", () => {
    const detected = recurringInWindow(
      monthlySeries("netflix", new Date(2025, 9, 5), 6),
      window
    );
    expect(detected).toHaveLength(1);
    expect(detected[0]?.merchantKey).toBe("netflix");
    expect(detected[0]?.frequency).toBe("monthly");
    expect(detected[0]?.occurrences).toBe(6);
  });

  it("excludes a merchant that stopped recurring before the window", () => {
    const detected = recurringInWindow(
      monthlySeries("old-gym", new Date(2024, 1, 5), 12),
      window
    );
    expect(detected).toHaveLength(0);
  });

  it("excludes occurrences after the window's end", () => {
    const detected = recurringInWindow(
      [
        ...monthlySeries("old-gym", new Date(2024, 1, 5), 12),
        ...monthlySeries("netflix", new Date(2025, 9, 5), 6),
        // A subscription that only starts after the observed period: the split
        // of a past period must not be classified with a later month's plan.
        ...monthlySeries("new-gym", new Date(2026, 9, 5), 4),
      ],
      window
    );
    expect(detected.map((e) => e.merchantKey)).toEqual(["netflix"]);
  });
});

describe("cadenceWindow", () => {
  const from = new Date(2026, 5, 1);
  const to = new Date(2026, 5, 30);

  it("reaches a year either side of the period", () => {
    const window = cadenceWindow(from, to);
    expect(window.from.getTime()).toBe(from.getTime() - WINDOW_MS);
    expect(window.to.getTime()).toBe(to.getTime() + WINDOW_MS);
  });

  it("classifies the first month of a history from the months after it", () => {
    // Rent starting in June is only recurring if the window sees July and
    // August; a trailing-only window would report June's rent as variable.
    const detected = recurringInWindow(
      monthlySeries("landlord", from, 3),
      cadenceWindow(from, to)
    );
    expect(detected.map((e) => e.merchantKey)).toEqual(["landlord"]);
    expect(detected[0]?.frequency).toBe("monthly");
  });
});

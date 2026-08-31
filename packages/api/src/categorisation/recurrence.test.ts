import { describe, expect, it } from "bun:test";

import type { RecurringExpense } from "./recurrence";

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

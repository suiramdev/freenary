import { describe, expect, test } from "bun:test";

import { effectiveCategory } from "./mcc-categories";

describe("effectiveCategory", () => {
  const transaction = {
    amount: -1000,
    bankTransactionCode: null,
    counterpartyName: null,
    merchantCategoryCode: "5411",
  };

  test("prefers a user or memo category over automatic resolution", () => {
    expect(
      effectiveCategory({
        ...transaction,
        category: "dining",
        resolvedCategory: "transport",
      })
    ).toBe("dining");
  });

  test("uses cascade resolution before MCC heuristics", () => {
    expect(
      effectiveCategory({
        ...transaction,
        category: null,
        resolvedCategory: "transport",
      })
    ).toBe("transport");
  });
});

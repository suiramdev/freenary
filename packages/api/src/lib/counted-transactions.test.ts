import { describe, expect, it } from "bun:test";

import { countedShareOf } from "./counted-transactions";

const row = (overrides: Partial<Parameters<typeof countedShareOf>[0]>) => ({
  category: null,
  exchangeFeeMinor: null,
  exclusion: null,
  isInternalTransfer: false,
  resolvedCategory: "groceries",
  ...overrides,
});

describe("countedShareOf", () => {
  it("counts an ordinary transaction whole", () => {
    expect(countedShareOf(row({}))).toBe("whole");
  });

  it("leaves out a transaction the member excluded, alone or with its merchant", () => {
    expect(countedShareOf(row({ exclusion: "TRANSACTION" }))).toBe("none");
    expect(countedShareOf(row({ exclusion: "MERCHANT" }))).toBe("none");
  });

  it("leaves out a transaction filed under transfers between the member's accounts", () => {
    expect(countedShareOf(row({ resolvedCategory: "internal-transfer" }))).toBe(
      "none"
    );

    expect(
      countedShareOf(
        row({ category: "internal-transfer", resolvedCategory: "people" })
      )
    ).toBe("none");
  });

  it("follows the member's category over the pipeline's", () => {
    expect(
      countedShareOf(
        row({ category: "people", resolvedCategory: "internal-transfer" })
      )
    ).toBe("whole");
  });

  it("counts a paired move into savings whole, unless the member filed it under transfers", () => {
    const intoSavings = row({
      isInternalTransfer: true,
      resolvedCategory: "savings",
    });

    expect(countedShareOf(intoSavings)).toBe("whole");
    expect(
      countedShareOf({ ...intoSavings, category: "internal-transfer" })
    ).toBe("none");
  });

  it("counts only the cost of an exchange between two currencies", () => {
    expect(
      countedShareOf(
        row({
          exchangeFeeMinor: 350,
          isInternalTransfer: true,
          resolvedCategory: "internal-transfer",
        })
      )
    ).toBe("exchange-fee");
  });
});

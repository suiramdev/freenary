import { describe, expect, it } from "bun:test";

import type { SpendingCategory } from "../lib/taxonomy";
import { deterministicCategory } from "./deterministic";
import type { CategoriseInput } from "./types";

const input = (overrides: Partial<CategoriseInput>): CategoriseInput => ({
  amountMinor: -1500,
  channel: "card",
  currency: "EUR",
  merchantKey: "unknown-merchant-xyz-abc",
  normalisedDescriptor: "unknown merchant xyz abc",
  path: "card",
  rawDescriptor: "CARTE 12/03 UNKNOWN MERCHANT XYZ ABC",
  userId: "test-user",
  ...overrides,
});

describe("deterministicCategory", () => {
  it("returns null when the transaction carries no deterministic signal", () => {
    expect(deterministicCategory(input({}))).toBeNull();
  });

  it("prefers the merchant category code over the bank code table", () => {
    const result = deterministicCategory(
      input({
        bankTransactionCode: "PRLV LOYER",
        country: "FR",
        merchantCategoryCode: "5411",
      })
    );

    expect(result).toEqual({
      category: "groceries",
      confidence: 0.8,
      stage: "mcc",
    });
  });

  it("applies the country layer for a supported country", () => {
    const result = deterministicCategory(
      input({ bankTransactionCode: "PRLV LOYER", country: "FR" })
    );

    expect(result?.category).toBe("rent");
    expect(result?.stage).toBe("rules");
  });

  it("reads no semantics out of the descriptor or the counterparty", () => {
    expect(
      deterministicCategory(
        input({
          counterpartyName: "PHARMACIE DU CENTRE",
          country: "FR",
          normalisedDescriptor: "netflix com",
        })
      )
    ).toBeNull();
  });

  it("still matches the inflected forms banks actually write", () => {
    const cases: [string, SpendingCategory, string | null][] = [
      ["PRLV IMPOTS", "other-taxes", "FR"],
      ["VIREMENT LOYERS", "rent", "FR"],
      ["VIREMENT SALAIRES", "salary", "FR"],
      ["PRLV ASSURANCES", "other-insurance", "FR"],
      ["SKATTEVERKET", "other-taxes", null],
    ];

    for (const [bankTransactionCode, category, country] of cases) {
      expect(
        deterministicCategory(
          input({ amountMinor: -1000, bankTransactionCode, country })
        )?.category
      ).toBe(category);
    }
  });

  it("anchors non-ASCII keywords too", () => {
    expect(
      deterministicCategory(
        input({ bankTransactionCode: "ÖVERFÖRING", country: "SE" })
      )?.category
    ).toBe("other-transfer");
  });

  it("rejects an expense keyword on a credit — that is a refund", () => {
    expect(
      deterministicCategory(
        input({
          amountMinor: 1500,
          bankTransactionCode: "PRLV LOYER",
          country: "FR",
        })
      )
    ).toBeNull();
  });

  it("accepts an income keyword on a credit", () => {
    const result = deterministicCategory(
      input({
        amountMinor: 250_000,
        bankTransactionCode: "VIREMENT SALAIRE",
        country: "FR",
      })
    );

    expect(result?.category).toBe("salary");
  });

  it("refuses a provider's own transaction type read as a bank code on a credit", () => {
    expect(
      deterministicCategory(
        input({
          amountMinor: 250_000,
          bankTransactionCode: "transfer",
          country: "FR",
        })
      )
    ).toBeNull();
  });
});

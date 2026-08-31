import { describe, expect, it } from "bun:test";

import { deriveCategory, effectiveCategory } from "./mcc-categories";
import type { SpendingCategory } from "./taxonomy";

describe("deriveCategory", () => {
  it("names a salary credit from its bank code", () => {
    // A credit is positive, so a bank code naming the income has to be read
    // before the sign alone decides. Otherwise the salary keyword is dead.
    expect(
      deriveCategory({ amount: 250_000, bankTransactionCode: "SALARY" })
    ).toBe("salary");
    expect(
      deriveCategory({
        amount: 250_000,
        bankTransactionCode: "Virement salaire",
      })
    ).toBe("salary");
  });

  it("treats a credit matching an expense keyword as unnamed income", () => {
    // A refund whose code says "transfer" is income, not a transfer out.
    expect(
      deriveCategory({ amount: 4500, bankTransactionCode: "TRANSFER IN" })
    ).toBe("other-income");
    expect(deriveCategory({ amount: 4500, bankTransactionCode: "IMPOT" })).toBe(
      "other-income"
    );
  });

  it("falls back to other-income for a credit with no signal", () => {
    expect(deriveCategory({ amount: 1000 })).toBe("other-income");
  });

  it("prefers the MCC over every heuristic", () => {
    expect(
      deriveCategory({
        amount: -2000,
        counterpartyName: "NETFLIX",
        merchantCategoryCode: "5411",
      })
    ).toBe("groceries");
  });

  it("splits the issuer-assigned 3xxx block at its real boundaries", () => {
    // 3000-3299 airlines, 3300-3499 car rental, 3500-3999 lodging. An off-by-one
    // here silently files a flight under accommodation.
    const byMcc = {
      "2999": "uncategorised",
      "3000": "flights",
      "3299": "flights",
      "3300": "other-travel",
      "3499": "other-travel",
      "3500": "accommodation",
      "3999": "accommodation",
      "4000": "uncategorised",
    } as const satisfies Record<string, SpendingCategory>;
    for (const [mcc, expected] of Object.entries(byMcc)) {
      expect(deriveCategory({ amount: -5000, merchantCategoryCode: mcc })).toBe(
        expected
      );
    }
  });

  it("reads a debit's bank code, then its counterparty", () => {
    expect(
      deriveCategory({ amount: -80_000, bankTransactionCode: "LOYER" })
    ).toBe("rent");
    expect(deriveCategory({ amount: -1500, counterpartyName: "Lidl" })).toBe(
      "groceries"
    );
  });

  it("returns uncategorised when nothing matches", () => {
    expect(
      deriveCategory({ amount: -500, counterpartyName: "ZZZ UNKNOWN LTD" })
    ).toBe("uncategorised");
  });

  it("decodes a resolution stored before the hierarchy", () => {
    // Legacy `dining` covered restaurants, bars and fast food, so it decodes to
    // the group's catch-all rather than claiming one of them.
    expect(deriveCategory({ amount: -500, resolvedCategory: "dining" })).toBe(
      "other-daily-living"
    );
    expect(
      deriveCategory({ amount: -500, resolvedCategory: "groceries" })
    ).toBe("groceries");
  });
});

describe("effectiveCategory", () => {
  it("lets a user override win over the pipeline", () => {
    expect(
      effectiveCategory({
        amount: -2000,
        category: "gifts",
        merchantCategoryCode: "5411",
      })
    ).toBe("gifts");
  });

  it("decodes a legacy override and ignores an unknown one", () => {
    expect(effectiveCategory({ amount: -2000, category: "dining" })).toBe(
      "other-daily-living"
    );
    expect(
      effectiveCategory({
        amount: -2000,
        category: "not-a-category",
        merchantCategoryCode: "5411",
      })
    ).toBe("groceries");
  });
});

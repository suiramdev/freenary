import { describe, expect, it } from "bun:test";

import { deterministicCategory } from "./deterministic";
import type { CategoriseInput } from "./types";

const input = (overrides: Partial<CategoriseInput>): CategoriseInput => ({
  amountMinor: -1500,
  channel: "card",
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

  it("prefers the merchant category code over the keyword tables", () => {
    const result = deterministicCategory(
      input({ merchantCategoryCode: "5411", normalisedDescriptor: "netflix" })
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

  it("prefers the counterparty name over the descriptor", () => {
    const result = deterministicCategory(
      input({
        counterpartyName: "PHARMACIE DU CENTRE",
        country: "FR",
        normalisedDescriptor: "netflix",
      })
    );
    expect(result?.category).toBe("pharmacy");
  });

  it("still reads the descriptor when the counterparty name matches nothing", () => {
    const result = deterministicCategory(
      input({
        counterpartyName: "ZZZ UNKNOWN LTD",
        normalisedDescriptor: "netflix com",
      })
    );
    expect(result?.category).toBe("streaming");
  });

  it("falls back to the descriptor when no counterparty name is reported", () => {
    const result = deterministicCategory(
      input({ normalisedDescriptor: "netflix com" })
    );
    expect(result?.category).toBe("streaming");
  });

  it("does not fire on a brand name buried inside another word", () => {
    // The tables run against whole descriptors, so short brands such as "ica"
    // and "bolt" must not match "medical" or "boltons".
    for (const descriptor of [
      "american express",
      "american airlines",
      "medical center",
      "clinique medicale",
      "cooperative agricole",
      "boltons pub",
    ]) {
      expect(
        deterministicCategory(input({ normalisedDescriptor: descriptor }))
      ).toBeNull();
    }
  });

  it("still matches the inflected forms banks actually write", () => {
    const cases: [string, string, string | null][] = [
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
    // A leading \b before "ö" never fires; the tables use letter-aware
    // lookarounds so this keyword is reachable at all.
    expect(
      deterministicCategory(
        input({ bankTransactionCode: "ÖVERFÖRING", country: "SE" })
      )?.category
    ).toBe("other-transfer");
    expect(
      deterministicCategory(input({ normalisedDescriptor: "apotek hjartat" }))
        ?.category
    ).toBe("pharmacy");
  });

  it("leaves a country's own vocabulary alone outside that country", () => {
    // "pharmacie" is a French rule; the default layer only knows pharmacy/apotek.
    expect(
      deterministicCategory(
        input({ country: "DE", normalisedDescriptor: "pharmacie du centre" })
      )
    ).toBeNull();
  });

  it("keeps the default layer for an unsupported country", () => {
    const result = deterministicCategory(
      input({ country: "DE", normalisedDescriptor: "netflix com" })
    );
    expect(result?.category).toBe("streaming");
  });

  it("rejects an expense keyword on a credit — that is a refund", () => {
    expect(
      deterministicCategory(
        input({ amountMinor: 1500, normalisedDescriptor: "netflix com" })
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

  // Powens sends its own type as the bank code, so a salary credit arrives as
  // "transfer" — a match the direction check refuses. The label still says
  // what it is.
  it("reads the country's wording from the descriptor when the bank code is refused", () => {
    const result = deterministicCategory(
      input({
        amountMinor: 250_000,
        bankTransactionCode: "transfer",
        country: "FR",
        normalisedDescriptor: "salaire",
      })
    );
    expect(result?.category).toBe("salary");
  });

  it("reads rent wording from the descriptor", () => {
    expect(
      deterministicCategory(
        input({ country: "FR", normalisedDescriptor: "loyer mensuel" })
      )?.category
    ).toBe("rent");
  });
});

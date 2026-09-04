import { describe, expect, it } from "bun:test";

import { categoriseTransaction, merchantKeyCandidates } from "./resolve";
import type { CategoriseInput } from "./types";

const baseInput: CategoriseInput = {
  amountMinor: -1500,
  channel: "card",
  merchantKey: "carrefour market",
  normalisedDescriptor: "carrefour market",
  path: "card",
  rawDescriptor: "CARTE 12/03 CARREFOUR MARKET PARIS",
  userId: "test-user",
};

describe("categoriseTransaction", () => {
  describe("channel short-circuit", () => {
    it("returns cash-withdrawal for ATM channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "atm",
      });
      expect(result.stage).toBe("channel");
      expect(result.category).toBe("cash-withdrawal");
      expect(result.band).toBe("auto");
      expect(result.confidence).toBe(0.9);
    });

    it("returns bank-fees for fee channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "fee",
      });
      expect(result.stage).toBe("channel");
      expect(result.category).toBe("bank-fees");
    });

    it("returns uncategorised for cheque channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "cheque",
      });
      expect(result.stage).toBe("channel");
      expect(result.category).toBe("uncategorised");
    });
  });

  describe("empty merchant key", () => {
    it("returns unknown when nothing else carries a signal", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantKey: "",
        normalisedDescriptor: "unknown merchant xyz abc",
      });
      expect(result.stage).toBe("none");
      expect(result.band).toBe("unknown");
      expect(result.category).toBeNull();
    });

    it("still runs the deterministic layer without a merchant key", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "5411",
        merchantKey: "",
        normalisedDescriptor: "",
      });
      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("groceries");
    });
  });

  describe("deterministic layer", () => {
    it("uses MCC when no earlier stage matches", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        // Use a merchant key that won't match anything
        merchantCategoryCode: "5411",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });
      // Should reach MCC stage (5411 = grocery stores)
      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("groceries");
      expect(result.band).toBe("auto");
    });

    it("uses this country's rules when no code is reported", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        bankTransactionCode: "PRLV LOYER",
        country: "FR",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });
      expect(result.stage).toBe("rules");
      expect(result.category).toBe("rent");
      expect(result.band).toBe("auto");
    });

    it("uses accommodation for MCC in the 3500-3999 range", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "3501",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });
      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("accommodation");
    });

    it("uses flights for MCC in the 3000-3299 range", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "3001",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });
      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("flights");
    });

    it("uses other-travel for MCC in the 3300-3499 range", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "3351",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });
      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("other-travel");
    });
  });

  describe("error resilience", () => {
    it("never throws, returns unknown on error", async () => {
      // SAFETY: deliberately passing empty object to test error resilience
      const result = await categoriseTransaction({} as CategoriseInput);
      expect(result.band).toBe("unknown");
      expect(result.stage).toBe("none");
    });
  });
});

describe("merchantKeyCandidates", () => {
  it("tries the key itself before any relaxation", () => {
    expect(merchantKeyCandidates("carrefour market", "FR")).toEqual([
      "carrefour market",
    ]);
  });

  it("drops trailing service words one at a time, longest key first", () => {
    expect(merchantKeyCandidates("free internet fibre", "FR")).toEqual([
      "free internet fibre",
      "free internet",
      "free",
    ]);
  });

  it("stops at the first token that is not a service word", () => {
    // "forfait mobile" must never reach "mobile" — that is the fuel brand Mobil.
    expect(merchantKeyCandidates("forfait mobile", "FR")).toEqual([
      "forfait mobile",
      "forfait",
    ]);
    expect(merchantKeyCandidates("halls beer mobile", "FR")).toEqual([
      "halls beer mobile",
      "halls beer",
    ]);
  });

  it("keeps a country's own service words out of other countries", () => {
    expect(merchantKeyCandidates("edf electricite", "DE")).toEqual([
      "edf electricite",
    ]);
  });

  it("refuses to strip down to an initial", () => {
    expect(merchantKeyCandidates("t mobile", "FR")).toEqual(["t mobile"]);
  });
});

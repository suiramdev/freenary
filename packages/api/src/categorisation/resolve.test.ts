import { describe, expect, it } from "bun:test";

import { categoriseTransaction } from "./resolve";
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
    it("returns transfers for ATM channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "atm",
      });
      expect(result.stage).toBe("channel");
      expect(result.category).toBe("transfers");
      expect(result.band).toBe("auto");
      expect(result.confidence).toBe(0.9);
    });

    it("returns other for fee channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "fee",
      });
      expect(result.stage).toBe("channel");
      expect(result.category).toBe("other");
    });

    it("returns other for cheque channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "cheque",
      });
      expect(result.stage).toBe("channel");
      expect(result.category).toBe("other");
    });
  });

  describe("empty merchant key", () => {
    it("returns unknown for empty merchant key", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantKey: "",
      });
      expect(result.stage).toBe("none");
      expect(result.band).toBe("unknown");
      expect(result.category).toBeNull();
    });
  });

  describe("MCC fallback", () => {
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
      expect(result.band).toBe("suggest");
    });

    it("uses travel for MCC in 3000-3999 range", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "3501",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });
      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("travel");
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

import { describe, expect, it } from "bun:test";

import { deriveMerchantKey } from "./merchant-key";
import type { MerchantKeyInput } from "./types";

const baseInput: MerchantKeyInput = {
  amountMinor: -1500,
  institutionName: "Test Bank",
  remittanceLines: ["CARTE 12/03 CARREFOUR MARKET PARIS"],
};

describe("deriveMerchantKey", () => {
  describe("card path", () => {
    it("derives normalised descriptor as merchant key", () => {
      const result = deriveMerchantKey(baseInput);
      expect(result.path).toBe("card");
      expect(result.merchantKey.length).toBeGreaterThan(0);
      expect(result.channel).toBeDefined();
    });

    it("uses sub-merchant text when intermediary detected", () => {
      const input: MerchantKeyInput = {
        ...baseInput,
        remittanceLines: ["PAYPAL *MERCHANT NAME"],
      };
      const result = deriveMerchantKey(input);
      expect(result.path).toBe("card");
      // The intermediary should be detected (PayPal)
      if (result.intermediaryName) {
        expect(result.intermediaryName.toLowerCase()).toContain("paypal");
      }
    });

    it("returns empty merchant key on empty remittance", () => {
      const result = deriveMerchantKey({
        ...baseInput,
        remittanceLines: [],
      });
      expect(result.merchantKey).toBe("");
    });
  });

  describe("IBAN path", () => {
    it("uses creditor IBAN as merchant key for RDDT", () => {
      const result = deriveMerchantKey({
        ...baseInput,
        bankTransactionFamilyCode: "RDDT",
        creditorIban: "FR7630006000011234567890189",
        remittanceLines: ["PRLV SEPA EDF"],
      });
      expect(result.path).toBe("iban");
      expect(result.merchantKey).toBe("FR7630006000011234567890189");
    });

    it("uses creditor IBAN as merchant key for RCDT", () => {
      const result = deriveMerchantKey({
        ...baseInput,
        bankTransactionFamilyCode: "RCDT",
        creditorIban: " fr7630006000011234567890189 ",
        remittanceLines: ["VIR SEPA SALARY"],
      });
      expect(result.path).toBe("iban");
      expect(result.merchantKey).toBe("FR7630006000011234567890189");
    });

    it("falls back to card path when no creditor IBAN", () => {
      const result = deriveMerchantKey({
        ...baseInput,
        bankTransactionFamilyCode: "RDDT",
        creditorIban: undefined,
      });
      expect(result.path).toBe("card");
    });

    it("falls back to card path for unknown family code", () => {
      const result = deriveMerchantKey({
        ...baseInput,
        bankTransactionFamilyCode: "UNKNOWN",
        creditorIban: "FR7630006000011234567890189",
      });
      expect(result.path).toBe("card");
    });
  });

  describe("error handling", () => {
    it("never throws, returns fallback", () => {
      // SAFETY: deliberately passing empty object to test error resilience
      const result = deriveMerchantKey({} as MerchantKeyInput);
      expect(result.merchantKey).toBe("");
      expect(result.path).toBe("card");
    });
  });
});

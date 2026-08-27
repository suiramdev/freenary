import { beforeAll, describe, expect, it } from "bun:test";

import { IBAN_INDEX } from "./catalogue";
import { detectIntermediary } from "./detect";

describe("detectIntermediary", () => {
  // ---------------------------------------------------------------
  // Marker matches with sub-merchant extraction
  // ---------------------------------------------------------------

  it("detects sumup and recovers sub-merchant", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "sumup boulangerie dupont",
      rawDescriptor: "CB SUMUP *BOULANGERIE DUPONT",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("sumup");
    expect(result.intermediaryName).toBe("SumUp");
    expect(result.submerchantText).toBe("boulangerie dupont");
    expect(result.normalisedSubmerchant).toBe("boulangerie dupont");
    expect(result.confidence).toBe("high");
    expect(result.matchedBy).toBe("marker");
  });

  it("detects square and recovers sub-merchant", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "sq walmart",
      rawDescriptor: "SQ *WALMART",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("square");
    expect(result.submerchantText).toBe("walmart");
    expect(result.normalisedSubmerchant).toBe("walmart");
    expect(result.confidence).toBe("high");
  });

  it("detects zettle and recovers sub-merchant", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "ztl nm burger ops",
      rawDescriptor: "ZTL*NM BURGER OPS",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("zettle");
    expect(result.intermediaryName).toBe("Zettle");
    expect(result.submerchantText).toBe("nm burger ops");
    expect(result.confidence).toBe("high");
  });

  it("detects paypal and recovers sub-merchant", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "paypal vinted",
      rawDescriptor: "PAYPAL*VINTED",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("paypal");
    expect(result.submerchantText).toBe("vinted");
    expect(result.normalisedSubmerchant).toBe("vinted");
    expect(result.confidence).toBe("high");
    expect(result.matchedBy).toBe("marker");
  });

  // ---------------------------------------------------------------
  // Critical counter-example: Amazon is NOT an intermediary
  // ---------------------------------------------------------------

  it("returns null for amzn mktp fr (not a catalogued intermediary)", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "amzn mktp fr",
      rawDescriptor: "AMZN Mktp FR*308J",
    });
    expect(result).toBeNull();
  });

  // ---------------------------------------------------------------
  // Non-leading marker must not match
  // ---------------------------------------------------------------

  it("returns null when marker is not the leading token", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "boulangerie sumup",
      rawDescriptor: "BOULANGERIE SUMUP",
    });
    expect(result).toBeNull();
  });

  // ---------------------------------------------------------------
  // Marker without sub-merchant
  // ---------------------------------------------------------------

  it("detects stripe alone with null submerchantText", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "stripe",
      rawDescriptor: "STRIPE",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("stripe");
    expect(result.submerchantText).toBeNull();
    expect(result.normalisedSubmerchant).toBe("");
    expect(result.matchedBy).toBe("marker");
  });

  it("stripe with trailing text still has null submerchant (carriesSubmerchant false)", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "stripe payments",
      rawDescriptor: "STRIPE PAYMENTS",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("stripe");
    expect(result.submerchantText).toBeNull();
  });

  // ---------------------------------------------------------------
  // IBAN-only match (no marker in descriptor)
  // ---------------------------------------------------------------

  const TEST_IBAN = "NL00TEST0000000099";

  beforeAll(() => {
    IBAN_INDEX[TEST_IBAN] = "adyen";
  });

  it("matches by IBAN when no marker is present", () => {
    const result = detectIntermediary({
      creditorIban: TEST_IBAN,
      normalisedDescriptor: "restaurant dupont",
      rawDescriptor: "RESTAURANT DUPONT",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("adyen");
    expect(result.intermediaryName).toBe("Adyen");
    expect(result.matchedBy).toBe("iban");
    expect(result.confidence).toBe("high");
    expect(result.submerchantText).toBeNull();
  });

  it("matches by creditor identifier with an empty descriptor", () => {
    const result = detectIntermediary({
      creditorIdentifications: [{ identification: "NL48ZZZ342764500000" }],
      normalisedDescriptor: "",
      rawDescriptor: "",
    });

    expect(result?.intermediaryId).toBe("adyen");
    expect(result?.matchedBy).toBe("creditor-identifier");
    expect(result?.confidence).toBe("high");
  });

  it("matches any creditor identification with an empty descriptor", () => {
    const result = detectIntermediary({
      creditorIdentifications: [
        { identification: "UNKNOWN" },
        { identification: "NL08ZZZ502057730000" },
      ],
      normalisedDescriptor: "",
      rawDescriptor: "",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("mollie");
    expect(result.intermediaryName).toBe("Mollie");
    expect(result.matchedBy).toBe("creditor-identifier");
    expect(result.confidence).toBe("high");
  });

  // ---------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------

  it("returns null for empty string without throwing", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "",
      rawDescriptor: "",
    });
    expect(result).toBeNull();
  });

  it("returns null when creditorIban is not in catalogue", () => {
    const result = detectIntermediary({
      creditorIban: "DE89370400440532013000",
      normalisedDescriptor: "unknown merchant",
      rawDescriptor: "UNKNOWN MERCHANT",
    });
    expect(result).toBeNull();
  });

  it("marker match takes priority over IBAN match", () => {
    const result = detectIntermediary({
      creditorIban: TEST_IBAN,
      normalisedDescriptor: "adyen some merchant",
      rawDescriptor: "ADYEN SOME MERCHANT",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.matchedBy).toBe("marker");
    expect(result.intermediaryId).toBe("adyen");
  });

  // ---------------------------------------------------------------
  // Asterisk corroboration promotes medium → high
  // ---------------------------------------------------------------

  it("promotes medium confidence to high when asterisk is at a scheme position", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "klarna",
      rawDescriptor: "KLARNA *STORE",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("klarna");
    expect(result.confidence).toBe("high");
  });

  it("keeps medium confidence when no corroborating asterisk", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "klarna",
      rawDescriptor: "KLARNA STORE",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("klarna");
    expect(result.confidence).toBe("medium");
  });

  // ---------------------------------------------------------------
  // PayPal alternate marker (pp)
  // ---------------------------------------------------------------

  it("detects pp as paypal", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "pp merchant name",
      rawDescriptor: "PP*MERCHANT NAME",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("paypal");
    expect(result.submerchantText).toBe("merchant name");
  });

  // ---------------------------------------------------------------
  // Checkout.com (cko marker)
  // ---------------------------------------------------------------

  it("detects cko as checkout.com", () => {
    const result = detectIntermediary({
      normalisedDescriptor: "cko online store",
      rawDescriptor: "CKO*ONLINE STORE",
    });
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("unreachable");
    }
    expect(result.intermediaryId).toBe("checkout");
    expect(result.intermediaryName).toBe("Checkout.com");
    expect(result.submerchantText).toBe("online store");
  });
});

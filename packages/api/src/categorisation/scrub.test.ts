import { describe, expect, it } from "bun:test";

import { scrubForContribution } from "./scrub";
import type { ScrubbedPayload, ScrubInput } from "./scrub";

const scrubbed = (input: ScrubInput): ScrubbedPayload => {
  const result = scrubForContribution(input);
  if (result === null) {
    throw new Error("expected a scrubbed payload, got null");
  }
  return result;
};

describe("scrubForContribution", () => {
  const validInput: ScrubInput = {
    amountMinor: -4599,
    category: "groceries",
    country: "FR",
    currency: "EUR",
    merchantCategoryCode: "5411",
    normalisedDescriptor: "carrefour market",
    transactionPath: "card",
  };

  it("produces a scrubbed payload with bucketed amount", () => {
    const result = scrubbed(validInput);
    expect(result.normalisedDescriptor).toBe("carrefour market");
    expect(result.amountBucket).toBe("small");
    expect(result.currency).toBe("EUR");
    expect(result.country).toBe("FR");
    expect(result.category).toBe("groceries");
    expect(result.transactionType).toBe("card");
  });

  it("returns null when descriptor is missing", () => {
    const result = scrubForContribution({
      ...validInput,
      normalisedDescriptor: "",
    });
    expect(result).toBeNull();
  });

  it("returns null when country is missing", () => {
    const result = scrubForContribution({ ...validInput, country: null });
    expect(result).toBeNull();
  });

  it("buckets micro amounts (<10€)", () => {
    const result = scrubbed({ ...validInput, amountMinor: -350 });
    expect(result.amountBucket).toBe("micro");
  });

  it("buckets medium amounts (<200€)", () => {
    const result = scrubbed({ ...validInput, amountMinor: -15_000 });
    expect(result.amountBucket).toBe("medium");
  });

  it("buckets large amounts (≥200€)", () => {
    const result = scrubbed({ ...validInput, amountMinor: -50_000 });
    expect(result.amountBucket).toBe("large");
  });

  it("does not leak exact amount, date, or account info", () => {
    const keys = Object.keys(scrubbed(validInput));
    expect(keys).not.toContain("amountMinor");
    expect(keys).not.toContain("date");
    expect(keys).not.toContain("accountId");
    expect(keys).not.toContain("userId");
  });
});

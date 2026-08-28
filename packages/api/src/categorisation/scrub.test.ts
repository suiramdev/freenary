import { describe, expect, it } from "bun:test";

import { scrubForContribution } from "./scrub";
import type { ScrubInput } from "./scrub";

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
    const result = scrubForContribution(validInput);
    expect(result).not.toBeNull();
    expect(result!.normalisedDescriptor).toBe("carrefour market");
    expect(result!.amountBucket).toBe("small");
    expect(result!.currency).toBe("EUR");
    expect(result!.country).toBe("FR");
    expect(result!.category).toBe("groceries");
    expect(result!.transactionType).toBe("card");
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
    const result = scrubForContribution({ ...validInput, amountMinor: -350 });
    expect(result!.amountBucket).toBe("micro");
  });

  it("buckets medium amounts (<200€)", () => {
    const result = scrubForContribution({
      ...validInput,
      amountMinor: -15_000,
    });
    expect(result!.amountBucket).toBe("medium");
  });

  it("buckets large amounts (≥200€)", () => {
    const result = scrubForContribution({
      ...validInput,
      amountMinor: -50_000,
    });
    expect(result!.amountBucket).toBe("large");
  });

  it("does not leak exact amount, date, or account info", () => {
    const result = scrubForContribution(validInput);
    expect(result).not.toBeNull();
    const keys = Object.keys(result!);
    expect(keys).not.toContain("amountMinor");
    expect(keys).not.toContain("date");
    expect(keys).not.toContain("accountId");
    expect(keys).not.toContain("userId");
  });
});

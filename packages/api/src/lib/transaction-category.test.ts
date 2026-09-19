import { describe, expect, it } from "bun:test";

import { effectiveCategory, pipelineCategory } from "./transaction-category";

describe("pipelineCategory", () => {
  it("reads the stored resolution", () => {
    expect(pipelineCategory({ resolvedCategory: "groceries" })).toBe(
      "groceries"
    );
  });

  it("decodes a resolution stored before the hierarchy", () => {
    expect(pipelineCategory({ resolvedCategory: "dining" })).toBe(
      "other-daily-living"
    );
  });

  it("reads an unresolved transaction as uncategorised", () => {
    expect(pipelineCategory({ resolvedCategory: null })).toBe("uncategorised");
    expect(pipelineCategory({ resolvedCategory: "not-a-category" })).toBe(
      "uncategorised"
    );
  });
});

describe("effectiveCategory", () => {
  it("lets a user override win over the pipeline", () => {
    expect(
      effectiveCategory({ category: "gifts", resolvedCategory: "groceries" })
    ).toBe("gifts");
  });

  it("decodes a legacy override", () => {
    expect(
      effectiveCategory({ category: "dining", resolvedCategory: "groceries" })
    ).toBe("other-daily-living");
  });

  it("falls through to the pipeline when the override is unknown", () => {
    expect(
      effectiveCategory({
        category: "not-a-category",
        resolvedCategory: "groceries",
      })
    ).toBe("groceries");
  });

  it("reads a transaction with neither column as uncategorised", () => {
    expect(effectiveCategory({ category: null, resolvedCategory: null })).toBe(
      "uncategorised"
    );
  });
});

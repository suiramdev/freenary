import { describe, expect, it } from "bun:test";

import { extractFeatures } from "./features";

describe("extractFeatures", () => {
  it("produces non-empty features for a descriptor", () => {
    const result = extractFeatures("carrefour market");
    expect(result.indices.length).toBeGreaterThan(0);
    expect(result.values.length).toBe(result.indices.length);
    expect(result.dimension).toBe(65_536);
  });

  it("returns sorted indices", () => {
    const result = extractFeatures("boulangerie paul");
    for (let i = 1; i < result.indices.length; i += 1) {
      expect(result.indices[i]).toBeGreaterThan(result.indices[i - 1]!);
    }
  });

  it("returns all positive values", () => {
    const result = extractFeatures("sncf");
    for (let i = 0; i < result.values.length; i += 1) {
      expect(result.values[i]).toBeGreaterThan(0);
    }
  });

  it("returns empty for empty input", () => {
    const result = extractFeatures("");
    expect(result.indices.length).toBe(0);
    expect(result.values.length).toBe(0);
  });

  it("produces deterministic output", () => {
    const a = extractFeatures("carrefour market");
    const b = extractFeatures("carrefour market");
    expect([...a.indices]).toEqual([...b.indices]);
    expect([...a.values]).toEqual([...b.values]);
  });

  it("accepts custom dimension and ngram range", () => {
    const result = extractFeatures("edf", 1024, [2, 3]);
    expect(result.dimension).toBe(1024);
    for (const idx of result.indices) {
      expect(idx).toBeLessThan(1024);
    }
  });
});

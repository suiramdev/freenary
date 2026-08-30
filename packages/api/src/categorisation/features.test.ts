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
    let previous: number | null = null;
    for (const index of result.indices) {
      if (previous !== null) {
        expect(index).toBeGreaterThan(previous);
      }
      previous = index;
    }
  });

  it("returns all positive values", () => {
    const result = extractFeatures("sncf");
    for (const value of result.values) {
      expect(value).toBeGreaterThan(0);
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

import { describe, expect, it } from "bun:test";

import type { LearnedVoteInput } from "./learned";
import { computeLearnedVote } from "./learned";

/** Guard that narrows null away and fails the test with a clear message. */
const assertDefined = <T>(value: T | null): T => {
  if (value === null) {
    throw new Error("expected non-null result");
  }
  return value;
};

describe("computeLearnedVote", () => {
  it("returns a match when 3 memos agree on groceries", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.7,
      },
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m2",
        merchantName: "Leclerc",
        similarity: 0.65,
      },
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m3",
        merchantName: "Auchan",
        similarity: 0.6,
      },
    ];

    const result = assertDefined(computeLearnedVote(results));

    expect(result.category).toBe("groceries");
    expect(result.matchCount).toBe(3);
    expect(result.bestSimilarity).toBe(0.7);
    // confidence = 0.5 + 0.4 * 0.7 * (3/3) = 0.78
    expect(result.confidence).toBeCloseTo(0.78, 5);
  });

  it("returns a match for a single memo with similarity >= 0.8", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.85,
      },
    ];

    const result = assertDefined(computeLearnedVote(results));

    expect(result.category).toBe("groceries");
    expect(result.matchCount).toBe(1);
    expect(result.bestSimilarity).toBe(0.85);
    // confidence = 0.5 + 0.4 * 0.85 * (1/1) = 0.84
    expect(result.confidence).toBeCloseTo(0.84, 5);
  });

  it("returns null for a single memo with similarity < 0.8", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.5,
      },
    ];

    expect(computeLearnedVote(results)).toBeNull();
  });

  it("returns null when two memos disagree", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.6,
      },
      {
        category: "dining",
        isUserScoped: true,
        merchantId: "m2",
        merchantName: "Le Bistrot",
        similarity: 0.6,
      },
    ];

    expect(computeLearnedVote(results)).toBeNull();
  });

  it("returns the majority category when 3 groceries outvote 1 dining", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.7,
      },
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m2",
        merchantName: "Leclerc",
        similarity: 0.65,
      },
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m3",
        merchantName: "Auchan",
        similarity: 0.6,
      },
      {
        category: "dining",
        isUserScoped: true,
        merchantId: "m4",
        merchantName: "Le Bistrot",
        similarity: 0.55,
      },
    ];

    const result = assertDefined(computeLearnedVote(results));

    expect(result.category).toBe("groceries");
    expect(result.matchCount).toBe(3);
    // confidence = 0.5 + 0.4 * 0.7 * (3/4) = 0.71
    expect(result.confidence).toBeCloseTo(0.71, 5);
  });

  it("returns null for empty input", () => {
    expect(computeLearnedVote([])).toBeNull();
  });

  it("weights user-scoped memos 2x over global memos", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.7,
      },
      {
        category: "dining",
        isUserScoped: false,
        merchantId: "m2",
        merchantName: "Le Bistrot",
        similarity: 0.7,
      },
      {
        category: "dining",
        isUserScoped: false,
        merchantId: "m3",
        merchantName: "Café de Flore",
        similarity: 0.65,
      },
    ];

    // groceries: weight 2 (1 user × 2), dining: weight 2 (2 global × 1) → tied → null
    expect(computeLearnedVote(results)).toBeNull();
  });

  it("user-scoped weight breaks a tie in favour of the user category", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.7,
      },
      {
        category: "groceries",
        isUserScoped: false,
        merchantId: "m2",
        merchantName: "Aldi",
        similarity: 0.6,
      },
      {
        category: "dining",
        isUserScoped: false,
        merchantId: "m3",
        merchantName: "Le Bistrot",
        similarity: 0.7,
      },
      {
        category: "dining",
        isUserScoped: false,
        merchantId: "m4",
        merchantName: "Café de Flore",
        similarity: 0.65,
      },
    ];

    // groceries: weight 3 (1 user + 1 global), dining: weight 2 (2 global)
    const result = assertDefined(computeLearnedVote(results));
    expect(result.category).toBe("groceries");
  });

  it("clamps confidence to 0.95", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m1",
        merchantName: "Carrefour",
        similarity: 0.99,
      },
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m2",
        merchantName: "Leclerc",
        similarity: 0.98,
      },
    ];

    const result = assertDefined(computeLearnedVote(results));
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  it("picks merchantId/merchantName from the best-similarity match", () => {
    const results: LearnedVoteInput[] = [
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m-low",
        merchantName: "Low Store",
        similarity: 0.5,
      },
      {
        category: "groceries",
        isUserScoped: true,
        merchantId: "m-high",
        merchantName: "High Store",
        similarity: 0.75,
      },
    ];

    const result = assertDefined(computeLearnedVote(results));
    expect(result.merchantId).toBe("m-high");
    expect(result.merchantName).toBe("High Store");
  });
});

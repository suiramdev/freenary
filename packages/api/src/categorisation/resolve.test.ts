import { afterEach, describe, expect, mock, test } from "bun:test";

import type { MerchantCandidate, ResolveRequest } from "./types";

let idfFailuresRemaining = 0;
let learnedQueryRows: unknown[] = [];

// Mock @freenary/db before any transitive import pulls it in
mock.module("@freenary/db", () => ({
  default: {
    $queryRaw: (query: TemplateStringsArray) => {
      const sql = query.join("");
      if (sql.includes('FROM "merchant", unnest') && idfFailuresRemaining > 0) {
        idfFailuresRemaining -= 1;
        throw new Error("transient IDF failure");
      }
      if (sql.includes("SELECT DISTINCT ON")) {
        return learnedQueryRows;
      }
      return [];
    },
    descriptorMemo: {
      deleteMany: () => ({}),
      update: () => ({}),
      upsert: () => ({}),
    },
    transaction: {
      upsert: () => ({}),
    },
  },
}));

// Dynamic import required: mock.module must register before resolve.ts loads @freenary/db
const { classifyCandidate, resolveTransaction } = await import("./resolve");
const { computeIdfPeak } = await import("./candidates");
const { getTokenIdf, resetTokenIdf } = await import("./idf");

afterEach(() => {
  idfFailuresRemaining = 0;
  learnedQueryRows = [];
  resetTokenIdf();
});

// ---------------------------------------------------------------------------
// classifyCandidate — pure gate decision, no DB needed
// ---------------------------------------------------------------------------

const candidate = (swsim: number, idfPeak: number): MerchantCandidate => ({
  category: "groceries",
  idfPeak,
  merchantId: "test-id",
  merchantName: "Test Merchant",
  similarity: 0.5,
  strictWordSimilarity: swsim,
});

describe("classifyCandidate", () => {
  test("high swsim + high IDF → auto", () => {
    const result = classifyCandidate(candidate(0.95, 11));
    expect(result.band).toBe("auto");
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.confidence).toBeLessThanOrEqual(0.99);
  });

  test("perfect swsim + low IDF → NOT auto (generic-noun collision)", () => {
    // The IDF gate: "pharmacie centre" matches at 1.0 swsim but idfPeak 3.4
    const result = classifyCandidate(candidate(1, 3.4));
    expect(result.band).not.toBe("auto");
    expect(result.band).toBe("suggest");
  });

  test("moderate swsim + high IDF → suggest", () => {
    const result = classifyCandidate(candidate(0.5, 11));
    expect(result.band).toBe("suggest");
    expect(result.confidence).toBeGreaterThan(0.3);
    expect(result.confidence).toBeLessThan(0.7);
  });

  test("low swsim + high IDF → unknown", () => {
    const result = classifyCandidate(candidate(0.2, 11));
    expect(result.band).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  test("boundary: swsim exactly 0.6 + idfPeak exactly 5 → auto", () => {
    const result = classifyCandidate(candidate(0.6, 5));
    expect(result.band).toBe("auto");
  });

  test("boundary: swsim exactly 0.45 + low IDF → suggest", () => {
    const result = classifyCandidate(candidate(0.45, 2));
    expect(result.band).toBe("suggest");
  });

  test("boundary: swsim just below 0.45 → unknown", () => {
    const result = classifyCandidate(candidate(0.44, 15));
    expect(result.band).toBe("unknown");
  });

  test("confidence capped at 0.99 for auto band", () => {
    const result = classifyCandidate(candidate(1, 10));
    expect(result.confidence).toBe(0.99);
  });
});

// ---------------------------------------------------------------------------
// resolveTransaction — channel short-circuit (no DB access in this path)
// ---------------------------------------------------------------------------

describe("resolveTransaction — channel short-circuit", () => {
  const baseRequest: ResolveRequest = {
    amountMinor: -1500,
    channel: "card",
    normalisedDescriptor: "some descriptor",
    rawDescriptor: "SOME DESCRIPTOR",
    userId: "test-user",
  };

  test("atm channel → merchant null, category transfers, band auto", async () => {
    const result = await resolveTransaction({
      ...baseRequest,
      channel: "atm",
    });

    expect(result.merchantId).toBeNull();
    expect(result.merchantName).toBeNull();
    expect(result.category).toBe("transfers");
    expect(result.band).toBe("auto");
    expect(result.stage).toBe("channel");
    expect(result.confidence).toBe(0.9);
  });

  test("fee channel → category other, band auto", async () => {
    const result = await resolveTransaction({
      ...baseRequest,
      channel: "fee",
    });

    expect(result.merchantId).toBeNull();
    expect(result.category).toBe("other");
    expect(result.band).toBe("auto");
    expect(result.stage).toBe("channel");
  });

  test("cheque channel → category other, band auto", async () => {
    const result = await resolveTransaction({
      ...baseRequest,
      channel: "cheque",
    });

    expect(result.merchantId).toBeNull();
    expect(result.category).toBe("other");
    expect(result.band).toBe("auto");
    expect(result.stage).toBe("channel");
  });
});

// ---------------------------------------------------------------------------
// resolveTransaction — intermediary without sub-merchant
// ---------------------------------------------------------------------------

describe("resolveTransaction — intermediary without sub-merchant", () => {
  test("intermediary-only descriptor → merchant null, band suggest, intermediary recorded", async () => {
    // "stripe" is a known intermediary with carriesSubmerchant: false
    const result = await resolveTransaction({
      amountMinor: -2000,
      channel: "card",
      normalisedDescriptor: "stripe",
      rawDescriptor: "STRIPE",
      userId: "test-user",
    });

    expect(result.merchantId).toBeNull();
    expect(result.merchantName).toBeNull();
    expect(result.intermediaryId).toBe("stripe");
    expect(result.intermediaryName).toBe("Stripe");
    expect(result.band).toBe("suggest");
    expect(result.stage).toBe("intermediary");
    expect(result.confidence).toBe(0.4);
  });

  test("creditor identification resolves with an empty descriptor", async () => {
    const result = await resolveTransaction({
      amountMinor: -2000,
      channel: "card",
      creditorIdentifications: [
        { identification: "UNKNOWN" },
        { identification: "NL48ZZZ342764500000" },
      ],
      normalisedDescriptor: "",
      rawDescriptor: "",
      userId: "test-user",
    });

    expect(result.intermediaryId).toBe("adyen");
    expect(result.intermediaryName).toBe("Adyen");
    expect(result.stage).toBe("intermediary");
  });
});

describe("resolveTransaction — learned suggestions", () => {
  test("does not expose merchant identity for suggest-band evidence", async () => {
    learnedQueryRows = [
      {
        category: "groceries",
        merchantId: "merchant-1",
        merchantName: "Merchant One",
        normalisedDescriptor: "merchant one paris",
        sim: 0.4,
        userId: "test-user",
      },
      {
        category: "groceries",
        merchantId: "merchant-2",
        merchantName: "Merchant Two",
        normalisedDescriptor: "merchant two paris",
        sim: 0.4,
        userId: "test-user",
      },
    ];

    const result = await resolveTransaction({
      amountMinor: -2000,
      channel: "card",
      normalisedDescriptor: "merchant paris",
      rawDescriptor: "MERCHANT PARIS",
      userId: "test-user",
    });

    expect(result.stage).toBe("learned");
    expect(result.band).toBe("suggest");
    expect(result.category).toBe("groceries");
    expect(result.merchantId).toBeNull();
    expect(result.merchantName).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveTransaction — never throws
// ---------------------------------------------------------------------------

describe("resolveTransaction — never throws", () => {
  test("empty descriptor, no channel match → falls through gracefully", async () => {
    const result = await resolveTransaction({
      amountMinor: -500,
      channel: "card",
      normalisedDescriptor: "",
      rawDescriptor: "",
      userId: "test-user",
    });

    expect(result.band).toBeDefined();
    expect(result.stage).toBeDefined();
    // Empty descriptor skips memo/dictionary, goes to unknown
    expect(result.stage).toBe("none");
    expect(result.band).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// computeIdfPeak — place-token exclusion (pure, no DB)
// ---------------------------------------------------------------------------

describe("computeIdfPeak — place-token exclusion", () => {
  const idf = {
    mcdonalds: 10.5,
    monoprix: 10.8,
    paris: 9.2,
  } as const satisfies Record<string, number>;
  const maxIdf = 11;

  test("shared place-only tokens → idfPeak 0", () => {
    // "mcdonalds paris" vs candidate "paris" — only shared token is place
    const peak = computeIdfPeak(["mcdonalds", "paris"], "paris", idf, maxIdf);
    expect(peak).toBe(0);
  });

  test("shared non-place token → idfPeak > 0", () => {
    // "mcdonalds paris" vs candidate "mcdonalds" — shared token is not a place
    const peak = computeIdfPeak(
      ["mcdonalds", "paris"],
      "mcdonalds",
      idf,
      maxIdf
    );
    expect(peak).toBe(10.5);
  });

  test("mixed shared tokens — place excluded, non-place kept", () => {
    // "monoprix paris" vs candidate "monoprix paris" — paris excluded, monoprix kept
    const peak = computeIdfPeak(
      ["monoprix", "paris"],
      "monoprix paris",
      idf,
      maxIdf
    );
    expect(peak).toBe(10.8);
  });

  test("unknown non-place token gets maxIdf", () => {
    const peak = computeIdfPeak(["carrefour"], "carrefour", idf, maxIdf);
    expect(peak).toBe(maxIdf);
  });
});

describe("getTokenIdf", () => {
  test("retries after a failed load", async () => {
    idfFailuresRemaining = 1;

    await expect(getTokenIdf()).rejects.toThrow("transient IDF failure");
    const result = await getTokenIdf();

    expect(result.totalMerchants).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// classifyCandidate — place-token gate regression
// ---------------------------------------------------------------------------

describe("classifyCandidate — place-token gate regression", () => {
  test("candidate sharing ONLY a place token must NOT be auto (idfPeak 0)", () => {
    // Simulates: "monoprix paris" matched "París" at swsim 1.0 but
    // idfPeak is 0 because the only shared token was the place "paris"
    const result = classifyCandidate({
      category: "shopping",
      idfPeak: 0,
      merchantId: "paris-store",
      merchantName: "París",
      similarity: 1,
      strictWordSimilarity: 1,
    });
    expect(result.band).not.toBe("auto");
  });

  test("candidate whose normalisedName is entirely place tokens rejected even at swsim 1.0", () => {
    // Even if somehow idfPeak were > 5, the low idfPeak from the gate (0)
    // prevents auto. This tests the gate with idfPeak = 0.
    const result = classifyCandidate({
      category: "shopping",
      idfPeak: 0,
      merchantId: "paris-lyon",
      merchantName: "Paris Lyon",
      similarity: 1,
      strictWordSimilarity: 1,
    });
    expect(result.band).toBe("suggest");
    expect(result.band).not.toBe("auto");
  });
});

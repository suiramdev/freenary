import { describe, expect, it } from "bun:test";

import type { SpendingCategory } from "../lib/taxonomy";
import type {
  CachedClassification,
  ClassificationRecord,
  ClassificationStore,
} from "./classifier/store";
import type {
  ClassificationInput,
  ClassificationPrediction,
  TransactionClassifier,
} from "./classifier/types";
import {
  categoriseBatch,
  categoriseTransaction,
  merchantKeyCandidates,
} from "./resolve";
import type { CategoriseInput } from "./types";

interface ScriptedClassifier extends TransactionClassifier {
  calls: number;
}

const DAYS_BEFORE_A_RETRY = 31;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STALE_ABSTENTION: CachedClassification = {
  category: null,
  classifiedAt: new Date(Date.now() - DAYS_BEFORE_A_RETRY * MS_PER_DAY),
  confidence: null,
};

const baseInput: CategoriseInput = {
  amountMinor: -1500,
  channel: "card",
  currency: "EUR",
  merchantKey: "carrefour market",
  normalisedDescriptor: "carrefour market",
  path: "card",
  rawDescriptor: "CARTE 12/03 CARREFOUR MARKET PARIS",
  userId: "test-user",
};

describe("categoriseTransaction", () => {
  describe("channel short-circuit", () => {
    it("returns cash-withdrawal for ATM channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "atm",
      });

      expect(result.stage).toBe("channel");
      expect(result.category).toBe("cash-withdrawal");
      expect(result.band).toBe("auto");
      expect(result.confidence).toBe(0.9);
    });

    it("returns bank-fees for fee channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "fee",
      });

      expect(result.stage).toBe("channel");
      expect(result.category).toBe("bank-fees");
    });

    it("returns uncategorised for cheque channel", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        channel: "cheque",
      });

      expect(result.stage).toBe("channel");
      expect(result.category).toBe("uncategorised");
    });
  });

  describe("empty merchant key", () => {
    it("returns unknown when nothing else carries a signal", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantKey: "",
        normalisedDescriptor: "unknown merchant xyz abc",
      });

      expect(result.stage).toBe("none");
      expect(result.band).toBe("unknown");
      expect(result.category).toBeNull();
    });

    it("still runs the deterministic layer without a merchant key", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "5411",
        merchantKey: "",
        normalisedDescriptor: "",
      });

      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("groceries");
    });
  });

  describe("deterministic layer", () => {
    it("uses MCC when no earlier stage matches", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "5411",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });

      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("groceries");
      expect(result.band).toBe("auto");
    });

    it("uses this country's rules when no code is reported", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        bankTransactionCode: "PRLV LOYER",
        country: "FR",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });

      expect(result.stage).toBe("rules");
      expect(result.category).toBe("rent");
      expect(result.band).toBe("auto");
    });

    it("uses accommodation for MCC in the 3500-3999 range", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "3501",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });

      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("accommodation");
    });

    it("uses flights for MCC in the 3000-3299 range", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "3001",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });

      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("flights");
    });

    it("uses other-travel for MCC in the 3300-3499 range", async () => {
      const result = await categoriseTransaction({
        ...baseInput,
        merchantCategoryCode: "3351",
        merchantKey: "unknown-merchant-xyz-abc",
        normalisedDescriptor: "unknown-merchant-xyz-abc",
      });

      expect(result.stage).toBe("mcc");
      expect(result.category).toBe("other-travel");
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

const scriptedClassifier = (
  answer: () => Promise<ClassificationPrediction | null>
): ScriptedClassifier => ({
  calls: 0,
  classify(input: ClassificationInput) {
    void input;
    this.calls += 1;

    return answer();
  },
  model: "test-model",
  provider: "test",
});

const memoryStore = (): ClassificationStore & {
  rows: Map<string, ClassificationRecord>;
} => {
  const rows = new Map<string, ClassificationRecord>();
  const times = new Map<string, Date>();

  return {
    find: (signature) => {
      const row = rows.get(signature);

      return Promise.resolve(
        row
          ? {
              category: row.category,
              classifiedAt: times.get(signature) ?? new Date(),
              confidence: row.confidence,
            }
          : null
      );
    },
    rows,
    save: (signature, record) => {
      rows.set(signature, record);
      times.set(signature, new Date());

      return Promise.resolve();
    },
  };
};

const unresolved: CategoriseInput = {
  ...baseInput,
  merchantKey: "unknown-merchant-xyz-abc",
  normalisedDescriptor: "unknown merchant xyz abc",
};

describe("categoriseBatch", () => {
  it("never asks the classifier about a transaction a deterministic stage resolved", async () => {
    const classifier = scriptedClassifier(() =>
      Promise.resolve({ category: "groceries", confidence: 0.9 })
    );
    const store = memoryStore();

    const results = await categoriseBatch(
      [
        { ...unresolved, merchantCategoryCode: "5411" },
        { ...baseInput, channel: "atm" },
      ],
      { classifier, countries: undefined, store }
    );

    expect(results.map((result) => result.stage)).toEqual(["mcc", "channel"]);
    expect(classifier.calls).toBe(0);
    expect(store.rows.size).toBe(0);
  });

  it("leaves a merchant unresolved when no classifier is configured", async () => {
    const store = memoryStore();

    const [result] = await categoriseBatch([unresolved], {
      classifier: null,
      countries: undefined,
      store,
    });

    expect(result?.stage).toBe("none");
    expect(result?.category).toBeNull();
    expect(store.rows.size).toBe(0);
  });

  it("stores and applies a category the classifier answered", async () => {
    const classifier = scriptedClassifier(() =>
      Promise.resolve({
        answeredBy: "test-model-1",
        category: "groceries",
        confidence: 0.9,
      })
    );
    const store = memoryStore();

    const [result] = await categoriseBatch([unresolved], {
      classifier,
      countries: undefined,
      store,
    });

    expect(result).toMatchObject({
      band: "auto",
      category: "groceries",
      confidence: 0.9,
      stage: "model",
    });
    expect([...store.rows.values()]).toEqual([
      {
        answeredBy: "test-model-1",
        category: "groceries",
        classifier,
        confidence: 0.9,
      },
    ]);
  });

  it("asks once per merchant identity, whatever the amounts", async () => {
    const classifier = scriptedClassifier(() =>
      Promise.resolve({ category: "groceries", confidence: 0.9 })
    );
    const store = memoryStore();

    const results = await categoriseBatch(
      [
        { ...unresolved, amountMinor: -500 },
        { ...unresolved, amountMinor: -90_000 },
      ],
      { classifier, countries: undefined, store }
    );

    expect(classifier.calls).toBe(1);
    expect(results.map((result) => result.stage)).toEqual(["model", "model"]);
  });

  it("reports once per merchant identity it settled", async () => {
    const classifier = scriptedClassifier(() =>
      Promise.resolve({ category: "groceries", confidence: 0.9 })
    );
    const settled: number[] = [];

    await categoriseBatch(
      [
        { ...unresolved, amountMinor: -500 },
        { ...unresolved, amountMinor: -90_000 },
        { ...unresolved, merchantKey: "other shop" },
      ],
      {
        classifier,
        countries: undefined,
        onSignatureSettled: () => {
          settled.push(settled.length);

          return Promise.resolve();
        },
        store: memoryStore(),
      }
    );

    expect(settled).toHaveLength(2);
  });

  it("reuses a stored answer on the next batch", async () => {
    const store = memoryStore();
    const first = scriptedClassifier(() =>
      Promise.resolve({ category: "groceries", confidence: 0.9 })
    );
    await categoriseBatch([unresolved], {
      classifier: first,
      countries: undefined,
      store,
    });

    const second = scriptedClassifier(() =>
      Promise.resolve({ category: "groceries", confidence: 0.9 })
    );
    const [result] = await categoriseBatch([unresolved], {
      classifier: second,
      countries: undefined,
      store,
    });

    expect(second.calls).toBe(0);
    expect(result?.stage).toBe("cached-model");
    expect(result?.category).toBe("groceries");
  });

  it("caches an abstention and retries it after a month", async () => {
    const store = memoryStore();
    const abstaining = scriptedClassifier(() => Promise.resolve(null));

    const [result] = await categoriseBatch([unresolved], {
      classifier: abstaining,
      countries: undefined,
      store,
    });

    expect(result?.stage).toBe("none");
    expect([...store.rows.values()]).toMatchObject([{ category: null }]);

    const soon = scriptedClassifier(() => Promise.resolve(null));
    await categoriseBatch([unresolved], {
      classifier: soon,
      countries: undefined,
      store,
    });

    expect(soon.calls).toBe(0);

    const stale = { ...store, find: () => Promise.resolve(STALE_ABSTENTION) };
    const later = scriptedClassifier(() => Promise.resolve(null));
    await categoriseBatch([unresolved], {
      classifier: later,
      countries: undefined,
      store: stale,
    });

    expect(later.calls).toBe(1);
  });

  it("refuses an answer outside the taxonomy and caches nothing", async () => {
    const classifier = scriptedClassifier(() =>
      Promise.resolve({
        category: "not-a-category" as SpendingCategory,
        confidence: 0.9,
      })
    );
    const store = memoryStore();

    const [result] = await categoriseBatch([unresolved], {
      classifier,
      countries: undefined,
      store,
    });

    expect(result?.stage).toBe("none");
    expect(store.rows.size).toBe(0);
  });

  it("survives a classifier that throws, and caches nothing", async () => {
    const classifier = scriptedClassifier(() =>
      Promise.reject(new Error("provider down"))
    );
    const store = memoryStore();

    const [result] = await categoriseBatch([unresolved], {
      classifier,
      countries: undefined,
      store,
    });

    expect(result?.stage).toBe("none");
    expect(store.rows.size).toBe(0);
  });

  it("gives up on a classifier that never answers, and caches nothing", async () => {
    const held = Promise.withResolvers<ClassificationPrediction | null>();
    const classifier = scriptedClassifier(() => held.promise);
    const store = memoryStore();

    const [result] = await categoriseBatch([unresolved], {
      classifier,
      countries: undefined,
      store,
      timeoutMs: 1,
    });

    held.resolve(null);

    expect(classifier.calls).toBe(1);
    expect(result?.stage).toBe("none");
    expect(store.rows.size).toBe(0);
  });
});

describe("merchantKeyCandidates", () => {
  it("tries the key itself before any relaxation", () => {
    expect(merchantKeyCandidates("carrefour market", "FR")).toEqual([
      "carrefour market",
    ]);
  });

  it("drops trailing service words one at a time, longest key first", () => {
    expect(merchantKeyCandidates("free internet fibre", "FR")).toEqual([
      "free internet fibre",
      "free internet",
      "free",
    ]);
  });

  it("stops at the first token that is not a service word", () => {
    expect(merchantKeyCandidates("forfait mobile", "FR")).toEqual([
      "forfait mobile",
      "forfait",
    ]);
    expect(merchantKeyCandidates("halls beer mobile", "FR")).toEqual([
      "halls beer mobile",
      "halls beer",
    ]);
  });

  it("keeps a country's own service words out of other countries", () => {
    expect(merchantKeyCandidates("edf electricite", "DE")).toEqual([
      "edf electricite",
    ]);
  });

  it("refuses to strip down to an initial", () => {
    expect(merchantKeyCandidates("t mobile", "FR")).toEqual(["t mobile"]);
  });
});

import { describe, expect, it } from "bun:test";

import { categoriesForDirection } from "../../../lib/taxonomy";
import type { ClassificationInput, ClassifierTransport } from "../types";
import { createJevClassifier } from "./jev";

interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

interface RecordedCall {
  authorization: string | null;
  body: {
    model: string;
    questions: Record<
      string,
      { type: string; criteria: Record<string, string> }
    >;
    state: ClassificationInput;
  };
  url: string;
}

const payload: ClassificationInput = {
  amountBucket: "small",
  channel: "card",
  counterpartyName: "EDF",
  country: "FR",
  currency: "EUR",
  direction: "debit",
  merchantCategoryCode: null,
  merchantKey: "edf",
  normalisedDescriptor: "edf paiement",
  path: "card",
};

const ANSWERED_BY = "jev-1.13.0";

const choice = (picked: string, confidence: number): ChoiceAnswer => ({
  choice: picked,
  confidence,
  probabilities: { [picked]: confidence },
  type: "choice",
});

const answering =
  (
    answers: Record<string, ChoiceAnswer>,
    calls: RecordedCall[] = []
  ): ClassifierTransport =>
  (url, init) => {
    calls.push({
      authorization: new Headers(init.headers).get("Authorization"),
      body: JSON.parse(String(init.body)),
      url,
    });

    return Promise.resolve(
      Response.json({ answers, model: ANSWERED_BY, usage: {} })
    );
  };

const refusing =
  (status: number): ClassifierTransport =>
  () =>
    Promise.resolve(new Response("rate limited", { status }));

describe("createJevClassifier", () => {
  it("asks one question over the payload, offering only what the direction allows", async () => {
    const calls: RecordedCall[] = [];
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("bills-utilities", 0.8) }, calls)
    );

    await classifier.classify(payload);

    const [call] = calls;

    expect(call?.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(call?.authorization).toBe("Bearer k");
    expect(call?.body.model).toBe("jev-latest");
    expect(call?.body.state).toEqual(payload);
    expect(Object.keys(call?.body.questions ?? {})).toEqual(["category"]);
    expect(call?.body.questions.category?.type).toBe("choice");
    expect(Object.keys(call?.body.questions.category?.criteria ?? {})).toEqual([
      ...categoriesForDirection("outgoing"),
    ]);
  });

  it("offers the incoming categories on a credit", async () => {
    const calls: RecordedCall[] = [];
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("salary", 0.8) }, calls)
    );

    await classifier.classify({ ...payload, direction: "credit" });

    expect(
      Object.keys(calls[0]?.body.questions.category?.criteria ?? {})
    ).toEqual([...categoriesForDirection("incoming")]);
  });

  it("describes every offered category rather than naming it", async () => {
    const calls: RecordedCall[] = [];
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("bills-utilities", 0.8) }, calls)
    );

    await classifier.classify(payload);

    for (const rubric of Object.values(
      calls[0]?.body.questions.category?.criteria ?? {}
    )) {
      expect(rubric.split(" ").length).toBeGreaterThan(3);
    }
  });

  it("reports the answer's own confidence", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("bills-utilities", 0.8) })
    );

    expect(await classifier.classify(payload)).toEqual({
      answeredBy: ANSWERED_BY,
      category: "bills-utilities",
      confidence: 0.8,
    });
  });

  it("abstains when the answer is below the acceptance bar", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("bills-utilities", 0.4) })
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains when the model says no category fits", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("uncategorised", 0.95) })
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains on a category the direction does not allow", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("groceries", 0.95) })
    );

    expect(
      await classifier.classify({ ...payload, direction: "credit" })
    ).toBeNull();
  });

  it("abstains on a category this taxonomy does not hold", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ category: choice("household-supplies", 0.95) })
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains when the answer is missing", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({})
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains when TypeSafe refuses the request", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      refusing(429)
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains when the answer is not the documented shape", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      () =>
        Promise.resolve(
          new Response("not json", {
            headers: { "Content-Type": "application/json" },
          })
        )
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains when the network is unreachable", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      () => Promise.reject(new Error("ECONNREFUSED"))
    );

    expect(await classifier.classify(payload)).toBeNull();
  });
});

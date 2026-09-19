import { describe, expect, it } from "bun:test";

import { CATEGORY_GROUPS } from "../../../lib/taxonomy";
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
    questions: Record<string, { type: string }>;
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

const choice = (picked: string, probability: number): ChoiceAnswer => ({
  choice: picked,
  confidence: probability,
  probabilities: { [picked]: probability },
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
  it("asks one group question and one leaf question per group over the payload", async () => {
    const calls: RecordedCall[] = [];
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering(
        {
          group: choice("utilities", 0.9),
          "leaf:utilities": choice("energy", 0.8),
        },
        calls
      )
    );

    await classifier.classify(payload);

    const [call] = calls;

    expect(call?.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(call?.authorization).toBe("Bearer k");
    expect(call?.body.model).toBe("jev-latest");
    expect(call?.body.state).toEqual(payload);
    expect(call?.body.questions.group?.type).toBe("choice");

    for (const group of CATEGORY_GROUPS) {
      expect(call?.body.questions[`leaf:${group}`]?.type).toBe("choice");
    }
  });

  it("multiplies the group and leaf probabilities into its confidence", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({
        group: choice("utilities", 0.9),
        "leaf:utilities": choice("energy", 0.8),
      })
    );

    expect(await classifier.classify(payload)).toEqual({
      answeredBy: ANSWERED_BY,
      category: "energy",
      confidence: 0.9 * 0.8,
    });
  });

  it("abstains when the joint probability is below the acceptance bar", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({
        group: choice("utilities", 0.6),
        "leaf:utilities": choice("energy", 0.6),
      })
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains when the model says it cannot tell", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({ group: choice("unknown", 0.95) })
    );

    expect(await classifier.classify(payload)).toBeNull();
  });

  it("abstains on a leaf that does not belong to the chosen group", async () => {
    const classifier = createJevClassifier(
      { apiKey: "k", model: "jev-latest" },
      answering({
        group: choice("utilities", 0.9),
        "leaf:utilities": choice("groceries", 0.9),
      })
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

import { describe, expect, it } from "bun:test";

import { Option, Result } from "effect";

import { createTransactionClassifier } from "./registry";

describe("createTransactionClassifier", () => {
  it("calls no model when no provider is configured", () => {
    const created = createTransactionClassifier({
      provider: undefined,
      typesafeApiKey: "k",
      typesafeModel: "jev-latest",
    });

    expect(Result.getOrThrow(created)).toBeNull();
  });

  it("refuses to start when jev has no API key", () => {
    const created = createTransactionClassifier({
      provider: "jev",
      typesafeApiKey: undefined,
      typesafeModel: "jev-latest",
    });

    expect(Result.isFailure(created)).toBe(true);
    expect(Option.getOrThrow(Result.getFailure(created))).toMatchObject({
      message:
        "TRANSACTION_CLASSIFIER=jev requires TYPESAFE_API_KEY to be set.",
      variable: "TYPESAFE_API_KEY",
    });
  });

  it("names the configured provider and model", () => {
    const classifier = Result.getOrThrow(
      createTransactionClassifier({
        provider: "jev",
        typesafeApiKey: "k",
        typesafeModel: "jev-latest",
      })
    );

    expect(classifier?.provider).toBe("jev");
    expect(classifier?.model).toBe("jev-latest");
  });
});

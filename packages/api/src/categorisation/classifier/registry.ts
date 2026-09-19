import { env } from "@freenary/env/server";
import { Data, Match, Result } from "effect";

import { createJevClassifier } from "./providers/jev";
import type { TransactionClassifier } from "./types";

export type ClassifierProviderName = "jev";

export interface ClassifierSettings {
  provider: ClassifierProviderName | undefined;
  typesafeApiKey: string | undefined;
  typesafeModel: string;
}

export class ClassifierUnavailable extends Data.TaggedError(
  "ClassifierUnavailable"
)<{
  readonly provider: ClassifierProviderName;
  readonly variable: string;
  readonly message: string;
}> {}

export const createTransactionClassifier = (
  settings: ClassifierSettings
): Result.Result<TransactionClassifier | null, ClassifierUnavailable> => {
  if (settings.provider === undefined) {
    return Result.succeed(null);
  }

  return Match.value(settings.provider).pipe(
    Match.when("jev", () =>
      Result.map(
        Result.fromNullishOr(
          settings.typesafeApiKey,
          () =>
            new ClassifierUnavailable({
              message:
                "TRANSACTION_CLASSIFIER=jev requires TYPESAFE_API_KEY to be set.",
              provider: "jev",
              variable: "TYPESAFE_API_KEY",
            })
        ),
        (apiKey) =>
          createJevClassifier({ apiKey, model: settings.typesafeModel })
      )
    ),
    Match.exhaustive
  );
};

export const transactionClassifier = Result.getOrThrow(
  createTransactionClassifier({
    provider: env.TRANSACTION_CLASSIFIER,
    typesafeApiKey: env.TYPESAFE_API_KEY,
    typesafeModel: env.TYPESAFE_MODEL,
  })
);

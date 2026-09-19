import { Data, Effect, Match, Schema } from "effect";

import type { CategoryGroup } from "../../../lib/taxonomy";
import {
  categoriesInGroup,
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUP_OF,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  isCategoryGroup,
  isSpendingCategory,
} from "../../../lib/taxonomy";
import type {
  ClassificationInput,
  ClassificationPrediction,
  ClassifierTransport,
  TransactionClassifier,
} from "../types";

export interface JevSettings {
  apiKey: string;
  model: string;
}

type JevClassificationReason =
  | { readonly kind: "unreachable"; readonly detail: string }
  | {
      readonly kind: "rejected";
      readonly status: number;
      readonly body: string;
    }
  | { readonly kind: "undecodable"; readonly detail: string }
  | { readonly kind: "unknown-category"; readonly value: string };

export class JevClassificationFailed extends Data.TaggedError(
  "JevClassificationFailed"
)<{
  readonly reason: JevClassificationReason;
}> {
  override get message(): string {
    return Match.value(this.reason).pipe(
      Match.discriminatorsExhaustive("kind")({
        rejected: ({ body, status }) =>
          `TypeSafe refused the classification: ${status} ${body}`,
        undecodable: ({ detail }) =>
          `TypeSafe answered outside the documented shape: ${detail}`,
        "unknown-category": ({ value }) =>
          `TypeSafe answered with a category this taxonomy does not hold: ${value}`,
        unreachable: ({ detail }) => `TypeSafe is unreachable: ${detail}`,
      })
    );
  }
}

const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const JEV_REQUEST_TIMEOUT_MS = 10_000;
const JEV_ACCEPT_PROBABILITY = 0.5;
const UNKNOWN_GROUP = "unknown";
const GROUP_QUESTION_ID = "group";

const leafQuestionId = (group: CategoryGroup): string => `leaf:${group}`;

const GROUP_CRITERIA = {
  ...Object.fromEntries(
    CATEGORY_GROUPS.map((group) => [
      group,
      `${CATEGORY_GROUP_LABELS[group]}: ${categoriesInGroup(group)
        .map((leaf) => CATEGORY_LABELS[leaf])
        .join(", ")}`,
    ])
  ),
  [UNKNOWN_GROUP]:
    "The text does not say what was bought or paid, and no group fits with reasonable certainty",
};

const JEV_QUESTIONS = {
  [GROUP_QUESTION_ID]: {
    criteria: GROUP_CRITERIA,
    instructions:
      "Which spending group best describes this bank transaction? Read the descriptor, merchant and counterparty together with the payment facts: direction, amount bucket, channel and merchant category code.",
    type: "choice",
  },
  ...Object.fromEntries(
    CATEGORY_GROUPS.map((group) => [
      leafQuestionId(group),
      {
        criteria: Object.fromEntries(
          categoriesInGroup(group).map((leaf) => [leaf, CATEGORY_LABELS[leaf]])
        ),
        instructions: `Within the ${CATEGORY_GROUP_LABELS[group]} group, which category fits this transaction?`,
        type: "choice",
      },
    ])
  ),
};

const ChoiceAnswerSchema = Schema.Struct({
  choice: Schema.String,
  confidence: Schema.Number,
  probabilities: Schema.Record(Schema.String, Schema.Number),
  type: Schema.Literal("choice"),
});

const JevResponseSchema = Schema.Struct({
  answers: Schema.Record(Schema.String, ChoiceAnswerSchema),
  model: Schema.String,
});

type JevResponse = typeof JevResponseSchema.Type;

const readAnswers = Effect.fnUntraced(function* readAnswers(
  settings: JevSettings,
  transport: ClassifierTransport,
  input: ClassificationInput
) {
  const response = yield* Effect.tryPromise({
    catch: (cause) =>
      new JevClassificationFailed({
        reason: { detail: String(cause), kind: "unreachable" },
      }),
    try: () =>
      transport(JEV_ENDPOINT, {
        body: JSON.stringify({
          model: settings.model,
          questions: JEV_QUESTIONS,
          state: input,
        }),
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(JEV_REQUEST_TIMEOUT_MS),
      }),
  });

  if (!response.ok) {
    const body = yield* Effect.tryPromise({
      catch: (cause) =>
        new JevClassificationFailed({
          reason: { detail: String(cause), kind: "unreachable" },
        }),
      try: () => response.text(),
    });

    return yield* new JevClassificationFailed({
      reason: { body, kind: "rejected", status: response.status },
    });
  }

  const payload = yield* Effect.tryPromise({
    catch: (cause) =>
      new JevClassificationFailed({
        reason: { detail: String(cause), kind: "undecodable" },
      }),
    try: () => response.json(),
  });

  return yield* Schema.decodeUnknownEffect(JevResponseSchema)(payload).pipe(
    Effect.mapError(
      (cause: Schema.SchemaError) =>
        new JevClassificationFailed({
          reason: { detail: cause.message, kind: "undecodable" },
        })
    )
  );
});

const readPrediction = Effect.fnUntraced(function* readPrediction(
  answered: JevResponse
) {
  const groupAnswer = answered.answers[GROUP_QUESTION_ID];

  if (!groupAnswer) {
    return yield* new JevClassificationFailed({
      reason: { detail: "no group answer", kind: "undecodable" },
    });
  }

  const group = groupAnswer.choice;

  if (group === UNKNOWN_GROUP || !isCategoryGroup(group)) {
    return null;
  }

  const leafAnswer = answered.answers[leafQuestionId(group)];

  if (!leafAnswer) {
    return yield* new JevClassificationFailed({
      reason: {
        detail: `no answer for ${leafQuestionId(group)}`,
        kind: "undecodable",
      },
    });
  }

  const leaf = leafAnswer.choice;

  if (!isSpendingCategory(leaf) || CATEGORY_GROUP_OF[leaf] !== group) {
    return yield* new JevClassificationFailed({
      reason: { kind: "unknown-category", value: leaf },
    });
  }

  if (leaf === "uncategorised") {
    return null;
  }

  const confidence =
    (groupAnswer.probabilities[group] ?? 0) *
    (leafAnswer.probabilities[leaf] ?? 0);

  if (confidence < JEV_ACCEPT_PROBABILITY) {
    return null;
  }

  return { answeredBy: answered.model, category: leaf, confidence };
});

const classifyWith = (
  settings: JevSettings,
  transport: ClassifierTransport,
  input: ClassificationInput
): Promise<ClassificationPrediction | null> =>
  Effect.runPromise(
    readAnswers(settings, transport, input).pipe(
      Effect.flatMap(readPrediction),
      Effect.match({
        onFailure: (failure: JevClassificationFailed) => {
          console.warn(`[categorisation] jev: ${failure.message}`);

          return null;
        },
        onSuccess: (prediction) => prediction,
      })
    )
  );

export const createJevClassifier = (
  settings: JevSettings,
  transport: ClassifierTransport = fetch
): TransactionClassifier => ({
  classify: (input) => classifyWith(settings, transport, input),
  model: settings.model,
  provider: "jev",
});

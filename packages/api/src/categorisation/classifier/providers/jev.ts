import { Data, Effect, Match, Schema } from "effect";

import type { SpendingCategory } from "../../../lib/taxonomy";
import {
  categoriesForDirection,
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
  | { readonly kind: "unoffered-category"; readonly value: string };

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
        "unoffered-category": ({ value }) =>
          `TypeSafe answered with a category this transaction cannot take: ${value}`,
        unreachable: ({ detail }) => `TypeSafe is unreachable: ${detail}`,
      })
    );
  }
}

const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const JEV_REQUEST_TIMEOUT_MS = 10_000;
const JEV_ACCEPT_CONFIDENCE = 0.5;
const CATEGORY_QUESTION_ID = "category";

const CATEGORY_CRITERIA = {
  benefits:
    "A benefit, allowance, pension or other payment from a state body or a pension fund",
  "bills-utilities":
    "Electricity, gas, water, heating, waste, internet, mobile or landline telephone",
  "car-fuel":
    "Fuel, charging, parking, tolls, servicing, repair or anything else a private vehicle costs",
  "cash-withdrawal": "Cash taken from or paid into an account",
  crypto: "The purchase of a cryptocurrency or a payment to a crypto exchange",
  entertainment:
    "Cinema, concerts, sport, games, hobbies, books and other leisure, but not a recurring subscription",
  "family-education":
    "Childcare, school, university, tuition, child support and other family costs",
  groceries: "Food and household shopping from a shop or a supermarket",
  health:
    "A doctor, a dentist, a hospital, a pharmacy, an optician or a health insurance premium",
  "investment-income":
    "A dividend, an interest payment, a coupon or the proceeds of a sale of an investment",
  "loans-bank-fees":
    "A loan repayment, credit interest, an account fee, a card fee or another bank charge",
  "other-income": "Money received that no other income category describes",
  people:
    "Money sent to or received from a private individual, such as a friend or a relative",
  refunds:
    "A refund, a reimbursement, a returned payment or an insurance claim settlement",
  "rent-mortgage":
    "Rent, a mortgage instalment, a service charge or property tax on a home",
  "rental-income": "Rent received from a property that the account holder lets",
  restaurants:
    "A restaurant, a cafe, a bar, a takeaway or a food delivery service",
  retirement:
    "A payment into a pension plan or another long-term retirement product",
  salary: "Pay from an employer, including wages, a bonus and expenses repaid",
  savings:
    "A transfer into a savings account or another product held to keep money",
  securities:
    "The purchase of shares, bonds, funds or another market security, and a payment to a broker",
  "self-employment":
    "Money a customer or a client pays for work the account holder did",
  shopping:
    "Clothes, electronics, furniture, gifts and other goods that are not food",
  subscriptions:
    "A recurring charge for a service, such as streaming, software or a membership",
  taxes: "Income tax, a social contribution or another payment to a tax office",
  "transport-travel":
    "A train, a bus, a plane, a taxi, a hotel or another journey away from home",
  uncategorised:
    "The text does not say what was bought or paid, and no other category fits with reasonable certainty",
} as const satisfies Record<SpendingCategory, string>;

const questionsFor = (offered: readonly SpendingCategory[]) => ({
  [CATEGORY_QUESTION_ID]: {
    criteria: Object.fromEntries(
      offered.map((category) => [category, CATEGORY_CRITERIA[category]])
    ) satisfies Record<string, string>,
    instructions:
      "Which category best describes this bank transaction? Read the descriptor, merchant and counterparty together with the payment facts: amount bucket, channel and merchant category code. The options already match the direction of the transaction.",
    type: "choice",
  },
});

const OFFERED_BY_DIRECTION = {
  credit: categoriesForDirection("incoming"),
  debit: categoriesForDirection("outgoing"),
} as const;

const QUESTIONS_BY_DIRECTION = {
  credit: questionsFor(OFFERED_BY_DIRECTION.credit),
  debit: questionsFor(OFFERED_BY_DIRECTION.debit),
} as const;

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
          questions: QUESTIONS_BY_DIRECTION[input.direction],
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
  answered: JevResponse,
  direction: ClassificationInput["direction"]
) {
  const answer = answered.answers[CATEGORY_QUESTION_ID];

  if (!answer) {
    return yield* new JevClassificationFailed({
      reason: { detail: "no category answer", kind: "undecodable" },
    });
  }

  const category = answer.choice;

  if (
    !isSpendingCategory(category) ||
    !OFFERED_BY_DIRECTION[direction].includes(category)
  ) {
    return yield* new JevClassificationFailed({
      reason: { kind: "unoffered-category", value: category },
    });
  }

  if (category === "uncategorised") {
    return null;
  }

  if (answer.confidence < JEV_ACCEPT_CONFIDENCE) {
    return null;
  }

  return {
    answeredBy: answered.model,
    category,
    confidence: answer.confidence,
  };
});

const classifyWith = (
  settings: JevSettings,
  transport: ClassifierTransport,
  input: ClassificationInput
): Promise<ClassificationPrediction | null> =>
  Effect.runPromise(
    readAnswers(settings, transport, input).pipe(
      Effect.flatMap((answered) => readPrediction(answered, input.direction)),
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

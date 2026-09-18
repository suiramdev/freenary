import { readFile } from "node:fs/promises";
import path from "node:path";

import { Data, Match, Option, Result } from "effect";
import { z } from "zod";

import type { SpendingCategory } from "../lib/taxonomy";
import { resolveCategorySlug } from "../lib/taxonomy";
import { extractFeatures, INPUT_VERSION, modelInput } from "./features";
import type { Iso3166Alpha2Country } from "./types";

export interface ModelPrediction {
  category: SpendingCategory;
  confidence: number;
}

interface LoadedModel {
  categories: string[];
  dimension: number;
  weights: Float64Array[];
}

interface ModelState {
  loaded: LoadedModel | null;
  openBatches: number;
}

type WeightsRefusal =
  | { readonly kind: "unreadable" }
  | {
      readonly kind: "input-version";
      readonly trainedOn: number;
      readonly expected: number;
    };

class WeightsRefused extends Data.TaggedError("WeightsRefused")<{
  readonly path: string;
  readonly reason: WeightsRefusal;
}> {}

const trainedWeightsSchema = z.object({
  categories: z.array(z.string()),
  dimension: z.number(),
  inputVersion: z.number(),
  weights: z.array(z.record(z.string(), z.number())),
});

type TrainedWeights = z.infer<typeof trainedWeightsSchema>;

const WEIGHTS_PATH = path.resolve(
  import.meta.dirname,
  "../../data/model-weights.json"
);

const CONFIDENCE_THRESHOLD = 0.5;

export const MODEL_ACCEPT_THRESHOLD = 0.7;

const SOFTMAX_EXPONENT_CLAMP = 500;

const state: ModelState = { loaded: null, openBatches: 0 };

const dotSparse = (
  weights: Float64Array,
  indices: Uint32Array,
  values: Float32Array
): number => {
  let sum = 0;
  let i = 0;

  for (const index of indices) {
    const weight = weights[index];
    const value = values[i];

    if (weight === undefined || value === undefined) {
      throw new Error(`Feature index ${index} is out of range for the model`);
    }

    sum += weight * value;
    i += 1;
  }

  return sum;
};

const softmax = (logits: Float64Array): Float64Array => {
  const probs = new Float64Array(logits.length);

  let maxLogit = -Infinity;

  for (const logit of logits) {
    if (logit > maxLogit) {
      maxLogit = logit;
    }
  }

  let sumExp = 0;

  for (const [i, logit] of logits.entries()) {
    const clamped = Math.max(
      -SOFTMAX_EXPONENT_CLAMP,
      Math.min(SOFTMAX_EXPONENT_CLAMP, logit - maxLogit)
    );
    const exp = Math.exp(clamped);
    probs[i] = exp;
    sumExp += exp;
  }

  for (const [i, prob] of probs.entries()) {
    probs[i] = prob / sumExp;
  }

  return probs;
};

const deserialiseWeights = (
  sparseWeights: Record<string, number>[],
  dimension: number
): Float64Array[] => {
  const dense: Float64Array[] = [];

  for (const sparse of sparseWeights) {
    const w = new Float64Array(dimension);

    for (const [idx, val] of Object.entries(sparse)) {
      const index = Number(idx);

      if (index >= 0 && index < dimension) {
        w[index] = val;
      }
    }

    dense.push(w);
  }

  return dense;
};

const featuresOrNone = Option.liftThrowable(extractFeatures);

const decodedWeightsOrNone = Option.liftThrowable(
  (raw: string): Result.Result<TrainedWeights, WeightsRefused> => {
    const parsed = trainedWeightsSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return Result.fail(
        new WeightsRefused({
          path: WEIGHTS_PATH,
          reason: { kind: "unreadable" },
        })
      );
    }

    if (parsed.data.inputVersion !== INPUT_VERSION) {
      return Result.fail(
        new WeightsRefused({
          path: WEIGHTS_PATH,
          reason: {
            expected: INPUT_VERSION,
            kind: "input-version",
            trainedOn: parsed.data.inputVersion,
          },
        })
      );
    }

    return Result.succeed(parsed.data);
  }
);

const warnRefusal = (refused: WeightsRefused): void => {
  console.warn(
    `[categorisation] ${Match.value(refused.reason).pipe(
      Match.discriminatorsExhaustive("kind")({
        "input-version": ({ expected, trainedOn }) =>
          `Weights file trained on input version ${trainedOn}, runtime expects ${expected}: ${refused.path} — refusing to load, retrain the model`,
        unreadable: () =>
          `Weights file unreadable: ${refused.path} — refusing to load`,
      })
    )}`
  );
};

export const loadModel = async (): Promise<void> => {
  state.openBatches += 1;

  if (state.openBatches > 1 && state.loaded) {
    return;
  }

  const raw = await readFile(WEIGHTS_PATH, "utf-8").then(
    Option.some,
    Option.none
  );
  const decoded = Option.isNone(raw)
    ? Option.none<Result.Result<TrainedWeights, WeightsRefused>>()
    : decodedWeightsOrNone(raw.value);

  if (Option.isNone(decoded)) {
    state.loaded = null;

    return;
  }

  Result.match(decoded.value, {
    onFailure: warnRefusal,
    onSuccess: (weights) => {
      state.loaded = {
        categories: weights.categories,
        dimension: weights.dimension,
        weights: deserialiseWeights(weights.weights, weights.dimension),
      };
    },
  });
};

export const unloadModel = (): void => {
  state.openBatches = Math.max(0, state.openBatches - 1);

  if (state.openBatches === 0) {
    state.loaded = null;
  }
};

export const predict = (
  normalisedDescriptor: string,
  country: Iso3166Alpha2Country | null | undefined
): Promise<ModelPrediction | null> => {
  const model = state.loaded;

  if (model === null || normalisedDescriptor.length === 0) {
    return Promise.resolve(null);
  }

  const features = featuresOrNone(
    modelInput(normalisedDescriptor, country),
    model.dimension
  );

  if (Option.isNone(features)) {
    return Promise.resolve(null);
  }

  const { indices, values } = features.value;
  const logits = new Float64Array(model.weights.length);

  for (const [c, weightVector] of model.weights.entries()) {
    logits[c] = dotSparse(weightVector, indices, values);
  }

  const probs = softmax(logits);

  let bestCategoryIndex = 0;
  let bestProbability = 0;

  for (const [i, prob] of probs.entries()) {
    if (prob > bestProbability) {
      bestProbability = prob;
      bestCategoryIndex = i;
    }
  }

  if (bestProbability < CONFIDENCE_THRESHOLD) {
    return Promise.resolve(null);
  }

  const storedCategory = model.categories[bestCategoryIndex];
  const category = storedCategory ? resolveCategorySlug(storedCategory) : null;

  if (category === null) {
    return Promise.resolve(null);
  }

  return Promise.resolve({ category, confidence: bestProbability });
};

import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { SpendingCategory } from "../lib/taxonomy";
import { resolveCategorySlug } from "../lib/taxonomy";
import type { FeatureVector } from "./features";
import { extractFeatures } from "./features";

export interface ModelPrediction {
  category: SpendingCategory;
  confidence: number;
}

// Trained weights format (sparse JSON produced by train-model.ts)

const trainedWeightsSchema = z.object({
  categories: z.array(z.string()),
  dimension: z.number(),
  weights: z.array(z.record(z.string(), z.number())),
});

const WEIGHTS_PATH = path.resolve(
  import.meta.dirname,
  "../../data/model-weights.json"
);

const CONFIDENCE_THRESHOLD = 0.5;

// Module-level state

let loadedCategories: string[] | null = null;
let loadedWeights: Float64Array[] | null = null;
let loadedDimension = 0;
let modelRefCount = 0;

// Math helpers

/**
 * Sparse dot product between a dense weight vector and a sparse feature vector.
 */
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
    // Unreachable: extractFeatures hashes buckets mod the model's dimension and
    // sizes indices/values in lockstep, so both reads are always in range.
    if (weight === undefined || value === undefined) {
      throw new Error(`Feature index ${index} is out of range for the model`);
    }
    sum += weight * value;
    i += 1;
  }

  return sum;
};

/**
 * Compute softmax probabilities from logits. Returns a new array.
 */
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
    const clamped = Math.max(-500, Math.min(500, logit - maxLogit));
    const exp = Math.exp(clamped);
    probs[i] = exp;
    sumExp += exp;
  }

  for (const [i, prob] of probs.entries()) {
    probs[i] = prob / sumExp;
  }

  return probs;
};

/**
 * Deserialise sparse weight records into dense Float64Arrays.
 */
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

// Public API

/**
 * Load the model into memory. Silently no-ops when no weights file exists.
 * Call at batch start.
 */
export const loadModel = async (): Promise<void> => {
  modelRefCount += 1;
  if (modelRefCount > 1 && loadedWeights) {
    return;
  }
  try {
    const raw = await readFile(WEIGHTS_PATH, "utf-8");
    const parsed = trainedWeightsSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return;
    }

    loadedCategories = parsed.data.categories;
    loadedDimension = parsed.data.dimension;
    loadedWeights = deserialiseWeights(
      parsed.data.weights,
      parsed.data.dimension
    );
  } catch {
    // No weights file or malformed — run without model predictions.
    loadedCategories = null;
    loadedWeights = null;
    loadedDimension = 0;
  }
};

/**
 * Release model memory. Call after batch completes.
 */
export const unloadModel = (): void => {
  modelRefCount = Math.max(0, modelRefCount - 1);
  if (modelRefCount === 0) {
    loadedCategories = null;
    loadedWeights = null;
    loadedDimension = 0;
  }
};

/**
 * Predict a category from a normalised descriptor.
 * Returns null when no model is loaded or confidence is too low.
 */
export const predict = (
  normalisedDescriptor: string,
  _country?: string | null
): Promise<ModelPrediction | null> => {
  if (
    loadedWeights === null ||
    loadedCategories === null ||
    normalisedDescriptor.length === 0
  ) {
    return Promise.resolve(null);
  }

  let features: FeatureVector;
  try {
    features = extractFeatures(normalisedDescriptor, loadedDimension);
  } catch {
    return Promise.resolve(null);
  }

  const { indices, values } = features;
  // train-model.ts writes one weight vector per category, in category order.
  const logits = new Float64Array(loadedWeights.length);

  for (const [c, weightVector] of loadedWeights.entries()) {
    logits[c] = dotSparse(weightVector, indices, values);
  }

  const probs = softmax(logits);

  // Find highest-probability category
  let bestIdx = 0;
  let bestProb = 0;
  for (const [i, prob] of probs.entries()) {
    if (prob > bestProb) {
      bestProb = prob;
      bestIdx = i;
    }
  }

  if (bestProb < CONFIDENCE_THRESHOLD) {
    return Promise.resolve(null);
  }

  // The weights file stores category names, so a name written before the
  // hierarchy is decoded; one that no longer resolves has no prediction to make.
  const storedCategory = loadedCategories[bestIdx];
  const category = storedCategory ? resolveCategorySlug(storedCategory) : null;
  if (category === null) {
    return Promise.resolve(null);
  }

  return Promise.resolve({ category, confidence: bestProb });
};

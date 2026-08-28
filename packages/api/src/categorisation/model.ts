import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SpendingCategory } from "../lib/mcc-categories";
import type { FeatureVector } from "./features";
import { extractFeatures } from "./features";

export interface ModelPrediction {
  category: SpendingCategory;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Trained weights format (sparse JSON produced by train-model.ts)
// ---------------------------------------------------------------------------

interface TrainedWeights {
  categories: string[];
  dimension: number;
  weights: Record<string, number>[];
}

const WEIGHTS_PATH = path.resolve(
  import.meta.dirname,
  "../../data/model-weights.json"
);

const CONFIDENCE_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let loadedCategories: string[] | null = null;
let loadedWeights: Float64Array[] | null = null;
let loadedDimension = 0;
let modelRefCount = 0;

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/**
 * Sparse dot product between a dense weight vector and a sparse feature vector.
 */
const dotSparse = (
  weights: Float64Array,
  indices: Uint32Array,
  values: Float32Array
): number => {
  let sum = 0;
  for (let i = 0; i < indices.length; i += 1) {
    // SAFETY: indices[i] and values[i] are within bounds for valid FeatureVectors
    sum += weights[indices[i]!]! * values[i]!;
  }
  return sum;
};

/**
 * Compute softmax probabilities from logits. Returns a new array.
 */
const softmax = (logits: Float64Array): Float64Array => {
  const probs = new Float64Array(logits.length);

  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i += 1) {
    if (logits[i]! > maxLogit) {
      maxLogit = logits[i]!;
    }
  }

  let sumExp = 0;
  for (let i = 0; i < logits.length; i += 1) {
    const clamped = Math.max(-500, Math.min(500, logits[i]! - maxLogit));
    const exp = Math.exp(clamped);
    probs[i] = exp;
    sumExp += exp;
  }

  for (let i = 0; i < probs.length; i += 1) {
    probs[i] = probs[i]! / sumExp;
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the model into memory. Silently no-ops when no weights file exists.
 * Call at batch start.
 */
export const loadModel = async (): Promise<void> => {
  modelRefCount++;
  if (modelRefCount > 1 && loadedWeights) {
    return;
  }
  try {
    const raw = await readFile(WEIGHTS_PATH, "utf-8");
    // SAFETY: the JSON file is produced by train-model.ts with a known schema
    const data = JSON.parse(raw) as TrainedWeights;

    if (
      !Array.isArray(data.categories) ||
      !Array.isArray(data.weights) ||
      typeof data.dimension !== "number"
    ) {
      return;
    }

    loadedCategories = data.categories;
    loadedDimension = data.dimension;
    loadedWeights = deserialiseWeights(data.weights, data.dimension);
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
  const numCategories = loadedCategories.length;
  const logits = new Float64Array(numCategories);

  for (let c = 0; c < numCategories; c += 1) {
    logits[c] = dotSparse(loadedWeights[c]!, indices, values);
  }

  const probs = softmax(logits);

  // Find highest-probability category
  let bestIdx = 0;
  let bestProb = 0;
  for (let i = 0; i < probs.length; i += 1) {
    if (probs[i]! > bestProb) {
      bestProb = probs[i]!;
      bestIdx = i;
    }
  }

  if (bestProb < CONFIDENCE_THRESHOLD) {
    return Promise.resolve(null);
  }

  // SAFETY: loadedCategories[bestIdx] is a valid SpendingCategory stored by train-model.ts
  const category = loadedCategories[bestIdx] as SpendingCategory;

  return Promise.resolve({ category, confidence: bestProb });
};

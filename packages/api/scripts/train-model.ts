/**
 * Train a linear classifier from user correction data.
 *
 * Reads (merchantKey, category) pairs from the MerchantOverride table,
 * extracts hashed n-gram features via extractFeatures(), and fits a
 * one-vs-rest logistic regression. Writes the weight matrix as JSON
 * to data/model-weights.json.
 *
 * Usage: bun packages/api/scripts/train-model.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import prisma from "@freenary/db";

import { extractFeatures } from "../src/categorisation/features";
import type { FeatureVector } from "../src/categorisation/features";
import { normaliseDescriptor } from "../src/categorisation/normalise/normalise-descriptor";
import { SPENDING_CATEGORIES } from "../src/lib/mcc-categories";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../data/model-weights.json"
);
const NUM_EPOCHS = 10;
const LEARNING_RATE = 0.1;
const L2_LAMBDA = 0.001;
const MIN_SAMPLES = 10;
const CONFIDENCE_DIMENSION = 65_536;

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
    // SAFETY: indices[i] and values[i] are always within bounds for valid FeatureVectors
    sum += weights[indices[i]!]! * values[i]!;
  }
  return sum;
};

/**
 * In-place softmax over an array of logits.
 * Returns the same array with probabilities summing to 1.
 */
const softmax = (logits: Float64Array): Float64Array => {
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i += 1) {
    if (logits[i]! > maxLogit) {
      maxLogit = logits[i]!;
    }
  }

  let sumExp = 0;
  for (let i = 0; i < logits.length; i += 1) {
    const exp = Math.exp(Math.max(-500, Math.min(500, logits[i]! - maxLogit)));
    logits[i] = exp;
    sumExp += exp;
  }

  for (let i = 0; i < logits.length; i += 1) {
    logits[i] = logits[i]! / sumExp;
  }

  return logits;
};

/**
 * Fisher–Yates shuffle (in-place).
 */
const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    // SAFETY: i and j are within bounds
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
};

// ---------------------------------------------------------------------------
// Training sample
// ---------------------------------------------------------------------------

interface TrainingSample {
  features: FeatureVector;
  label: number;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const buildCategoryIndex = (): Map<string, number> => {
  const index = new Map<string, number>();
  for (let i = 0; i < SPENDING_CATEGORIES.length; i += 1) {
    index.set(SPENDING_CATEGORIES[i]!, i);
  }
  return index;
};

const loadTrainingData = async (): Promise<TrainingSample[]> => {
  const categoryIndex = buildCategoryIndex();
  const samples: TrainingSample[] = [];

  // Source 1: MerchantOverride — user corrections on merchant keys
  const overrides = await prisma.merchantOverride.findMany({
    select: { category: true, merchantKey: true },
  });

  for (const override of overrides) {
    const normalised = normaliseDescriptor(override.merchantKey);
    if (normalised.length === 0) {
      continue;
    }

    const label = categoryIndex.get(override.category);
    if (label === undefined) {
      continue;
    }

    const features = extractFeatures(normalised, CONFIDENCE_DIMENSION);
    samples.push({ features, label });
  }

  // Source 2: Transactions with user-applied category overrides
  const transactions = await prisma.transaction.findMany({
    select: { category: true, normalisedDescriptor: true },
    where: {
      category: { not: null },
      categoryOverride: true,
      normalisedDescriptor: { not: null },
    },
  });

  for (const tx of transactions) {
    if (tx.normalisedDescriptor === null || tx.category === null) {
      continue;
    }

    if (tx.normalisedDescriptor.length === 0) {
      continue;
    }

    const label = categoryIndex.get(tx.category);
    if (label === undefined) {
      continue;
    }

    const features = extractFeatures(
      tx.normalisedDescriptor,
      CONFIDENCE_DIMENSION
    );
    samples.push({ features, label });
  }

  return samples;
};

// ---------------------------------------------------------------------------
// SGD logistic regression
// ---------------------------------------------------------------------------

interface TrainedModel {
  categories: string[];
  dimension: number;
  weights: Record<string, number>[];
}

const train = (
  samples: TrainingSample[],
  numCategories: number,
  dimension: number
): Float64Array[] => {
  // Weight matrix: one Float64Array per category
  const weights: Float64Array[] = [];
  for (let c = 0; c < numCategories; c += 1) {
    weights.push(new Float64Array(dimension));
  }

  const logits = new Float64Array(numCategories);

  for (let epoch = 0; epoch < NUM_EPOCHS; epoch += 1) {
    shuffle(samples);
    let totalLoss = 0;

    for (const sample of samples) {
      const { features, label } = sample;
      const { indices, values } = features;

      // Forward: compute logits and softmax probabilities
      for (let c = 0; c < numCategories; c += 1) {
        logits[c] = dotSparse(weights[c]!, indices, values);
      }
      softmax(logits);

      // Cross-entropy loss for logging
      const prob = logits[label]!;
      totalLoss += -Math.log(Math.max(prob, 1e-15));

      // Backward: gradient update
      for (let c = 0; c < numCategories; c += 1) {
        // gradient = (p_c - y_c) where y_c = 1 if c === label else 0
        const grad = logits[c]! - (c === label ? 1 : 0);
        const w = weights[c]!;

        for (let i = 0; i < indices.length; i += 1) {
          const idx = indices[i]!;
          // SGD step with L2 regularization
          w[idx] =
            w[idx]! - LEARNING_RATE * (grad * values[i]! + L2_LAMBDA * w[idx]!);
        }
      }
    }

    const avgLoss = totalLoss / samples.length;
    console.log(
      `  epoch ${epoch + 1}/${NUM_EPOCHS}  loss=${avgLoss.toFixed(6)}`
    );
  }

  return weights;
};

// ---------------------------------------------------------------------------
// Serialisation — sparse format to keep the file small
// ---------------------------------------------------------------------------

const serialiseWeights = (
  weights: Float64Array[],
  dimension: number
): TrainedModel => {
  const sparseWeights: Record<string, number>[] = [];

  for (const w of weights) {
    const sparse: Record<string, number> = {};
    for (let i = 0; i < w.length; i += 1) {
      if (w[i] !== 0) {
        sparse[String(i)] = w[i]!;
      }
    }
    sparseWeights.push(sparse);
  }

  return {
    categories: [...SPENDING_CATEGORIES],
    dimension,
    weights: sparseWeights,
  };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async (): Promise<void> => {
  console.log("Loading training data...");
  const samples = await loadTrainingData();

  console.log(`Found ${samples.length} training samples`);

  if (samples.length < MIN_SAMPLES) {
    console.log(
      `Fewer than ${MIN_SAMPLES} training samples — skipping model training.`
    );
    return;
  }

  const numCategories = SPENDING_CATEGORIES.length;

  console.log(
    `Training logistic regression: ${numCategories} categories, dimension=${CONFIDENCE_DIMENSION}, ${NUM_EPOCHS} epochs`
  );

  const weights = train(samples, numCategories, CONFIDENCE_DIMENSION);
  const model = serialiseWeights(weights, CONFIDENCE_DIMENSION);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(model), "utf-8");

  console.log(`Wrote model weights to ${OUTPUT_PATH}`);
  console.log(
    `  samples=${samples.length}  epochs=${NUM_EPOCHS}  categories=${numCategories}`
  );
};

const run = async (): Promise<void> => {
  try {
    await main();
  } catch (error: unknown) {
    console.error("Training failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();

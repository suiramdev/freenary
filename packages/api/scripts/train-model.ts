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

// Configuration

const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../data/model-weights.json"
);
const NUM_EPOCHS = 10;
const LEARNING_RATE = 0.1;
const L2_LAMBDA = 0.001;
const MIN_SAMPLES = 10;
const CONFIDENCE_DIMENSION = 65_536;

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
    // Unreachable: extractFeatures hashes buckets mod dimension and sizes
    // indices/values in lockstep, so both reads are always in range.
    if (weight === undefined || value === undefined) {
      throw new Error(
        `Feature vector out of range at position ${i} (bucket ${index})`
      );
    }
    sum += weight * value;
    i += 1;
  }
  return sum;
};

/**
 * In-place softmax over an array of logits.
 * Returns the same array with probabilities summing to 1.
 */
const softmax = (logits: Float64Array): Float64Array => {
  let maxLogit = -Infinity;
  for (const logit of logits) {
    if (logit > maxLogit) {
      maxLogit = logit;
    }
  }

  // Each pass only writes the slot the iterator has already yielded, so
  // rewriting in place cannot disturb the remaining reads.
  let sumExp = 0;
  let i = 0;
  for (const logit of logits) {
    const exp = Math.exp(Math.max(-500, Math.min(500, logit - maxLogit)));
    logits[i] = exp;
    sumExp += exp;
    i += 1;
  }

  i = 0;
  for (const exp of logits) {
    logits[i] = exp / sumExp;
    i += 1;
  }

  return logits;
};

/**
 * Fisher–Yates shuffle (in-place).
 */
const shuffle = <T extends NonNullable<unknown>>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = arr[i];
    const picked = arr[j];
    // Both offsets are in range for a dense array; a hole would corrupt the swap.
    if (current === undefined || picked === undefined) {
      throw new Error(`Cannot shuffle an array with a hole at ${i} or ${j}`);
    }
    arr[i] = picked;
    arr[j] = current;
  }
  return arr;
};

// Training sample

interface TrainingSample {
  features: FeatureVector;
  label: number;
}

// Data loading

const buildCategoryIndex = (): Map<string, number> => {
  const index = new Map<string, number>();
  for (const [i, category] of SPENDING_CATEGORIES.entries()) {
    index.set(category, i);
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

// SGD logistic regression

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
  const weights = Array.from(
    { length: numCategories },
    () => new Float64Array(dimension)
  );

  const logits = new Float64Array(numCategories);

  for (let epoch = 0; epoch < NUM_EPOCHS; epoch += 1) {
    shuffle(samples);
    let totalLoss = 0;

    for (const sample of samples) {
      const { features, label } = sample;
      const { indices, values } = features;

      // Forward: compute logits and softmax probabilities
      let c = 0;
      for (const w of weights) {
        logits[c] = dotSparse(w, indices, values);
        c += 1;
      }
      softmax(logits);

      // Cross-entropy loss for logging
      const prob = logits[label];
      if (prob === undefined) {
        throw new Error(
          `Sample label ${label} outside 0..${numCategories - 1}`
        );
      }
      totalLoss += -Math.log(Math.max(prob, 1e-15));

      // Backward: gradient update
      c = 0;
      for (const w of weights) {
        const logit = logits[c];
        if (logit === undefined) {
          throw new Error(`Missing logit for category ${c}`);
        }
        // gradient = (p_c - y_c) where y_c = 1 if c === label else 0
        const grad = logit - (c === label ? 1 : 0);

        let i = 0;
        for (const idx of indices) {
          const weight = w[idx];
          const value = values[i];
          if (weight === undefined || value === undefined) {
            throw new Error(
              `Feature vector out of range at position ${i} (bucket ${idx})`
            );
          }
          // SGD step with L2 regularization
          w[idx] = weight - LEARNING_RATE * (grad * value + L2_LAMBDA * weight);
          i += 1;
        }
        c += 1;
      }
    }

    const avgLoss = totalLoss / samples.length;
    console.log(
      `  epoch ${epoch + 1}/${NUM_EPOCHS}  loss=${avgLoss.toFixed(6)}`
    );
  }

  return weights;
};

// Serialisation — sparse format to keep the file small

const serialiseWeights = (
  weights: Float64Array[],
  dimension: number
): TrainedModel => {
  const sparseWeights: Record<string, number>[] = [];

  for (const w of weights) {
    const sparse: Record<string, number> = {};
    let i = 0;
    for (const value of w) {
      if (value !== 0) {
        sparse[String(i)] = value;
      }
      i += 1;
    }
    sparseWeights.push(sparse);
  }

  return {
    categories: [...SPENDING_CATEGORIES],
    dimension,
    weights: sparseWeights,
  };
};

// Main

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

/**
 * Train the global transaction classifier.
 *
 * Two sources, in increasing order of authority:
 *
 *   1. The merchant dictionary — real merchant names and aliases, labelled from
 *      OSM tags (NSI), the curated supplement, and SIRENE NAF codes. A bootstrap
 *      prior, not ground truth.
 *   2. User corrections — MerchantOverride rows and transactions the user
 *      recategorised. Ground truth, weighted above the prior.
 *
 * Weights are written to data/model-weights.json only when held-out precision
 * at MODEL_ACCEPT_THRESHOLD — the confidence resolve.ts writes a category at —
 * clears MIN_PRECISION; otherwise the script exits non-zero and leaves the
 * classifier inert.
 *
 * Exit codes:
 *   0 — weights written
 *   1 — training failed, or no dictionary artifact to evaluate against
 *   2 — evaluated and refused by the shipping gate
 *
 * Usage: bun packages/api/scripts/train-model.ts [--dictionary-only]
 *
 * --dictionary-only skips the corrections in the database, for the CI job that
 * trains the canonical weights against a fresh dictionary build and has no
 * instance to read corrections from.
 */

import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import prisma from "@freenary/db";

import {
  extractFeatures,
  fnv1a32,
  INPUT_VERSION,
  modelInput,
} from "../src/categorisation/features";
import type { FeatureVector } from "../src/categorisation/features";
import { isInCountryScope } from "../src/categorisation/merchant-scope";
import { MODEL_ACCEPT_THRESHOLD } from "../src/categorisation/model";
import { normaliseDescriptor } from "../src/categorisation/normalise/normalise-descriptor";
import { SUPPORTED_COUNTRIES } from "../src/categorisation/supported-countries";
import { resolveCategorySlug, SPENDING_CATEGORIES } from "../src/lib/taxonomy";

// Configuration

const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../data/model-weights.json"
);
const DATA_DIR = path.resolve(import.meta.dirname, "../data");
const NUM_EPOCHS = 10;
const LEARNING_RATE = 0.1;
const L2_LAMBDA = 0.001;
const MIN_SAMPLES = 10;
const CONFIDENCE_DIMENSION = 65_536;

/**
 * A human correction outweighs a dictionary prior. Dictionary entries
 * outnumber corrections by orders of magnitude early on, so without this the
 * prior would drown out the ground truth it exists to bootstrap.
 */
const DICTIONARY_SAMPLE_WEIGHT = 1;
const CORRECTION_SAMPLE_WEIGHT = 20;

/** Fraction of dictionary merchants held out to measure generalisation. */
const HOLDOUT_FRACTION = 0.2;

/** Exit status for a gate refusal, so CI can tell it apart from a crash. */
const EXIT_REFUSED = 2;

const DICTIONARY_ONLY = process.argv.includes("--dictionary-only");

/** Fixed seed: two runs over the same data must produce the same weights. */
const SHUFFLE_SEED = 1_588_635_695;

/**
 * Precision the model must clear at MODEL_ACCEPT_THRESHOLD before shipping.
 * Below this a written category costs more corrections than it saves.
 */
const MIN_PRECISION = 0.75;

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
 * Deterministic PRNG (Park–Miller). Training must be reproducible: the same
 * data has to yield the same weights, so the epoch shuffle cannot use
 * Math.random(). The multiply stays under 2^53, so it needs no bitwise
 * coercion to stay exact.
 */
const LEHMER_MODULUS = 2_147_483_647;
const LEHMER_MULTIPLIER = 16_807;

const rng = (seed: number): (() => number) => {
  let state = seed % LEHMER_MODULUS;
  if (state <= 0) {
    state += LEHMER_MODULUS - 1;
  }
  return () => {
    state = (state * LEHMER_MULTIPLIER) % LEHMER_MODULUS;
    return (state - 1) / (LEHMER_MODULUS - 1);
  };
};

/**
 * Fisher–Yates shuffle (in-place), driven by a caller-supplied PRNG.
 */
const shuffle = <T extends NonNullable<unknown>>(
  arr: T[],
  random: () => number
): T[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
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
  /** Relative influence on the gradient; a correction outweighs a prior. */
  weight: number;
}

// Data loading

const buildCategoryIndex = (): Map<string, number> => {
  const index = new Map<string, number>();
  for (const [i, category] of SPENDING_CATEGORIES.entries()) {
    index.set(category, i);
  }
  return index;
};

// Source 1: the merchant dictionary — a bootstrap prior over open data (NSI
// OSM tags, curated supplement, SIRENE NAF). Same shape the runtime loader reads.

interface DictionaryMerchant {
  id: string;
  name: string;
  normalisedName: string;
  category: string | null;
  /** Absent or empty means worldwide; see src/categorisation/merchant-scope.ts. */
  countries?: string[];
  domains: string[];
  source: string;
  aliases: { alias: string; normalisedAlias: string }[];
}

/**
 * One dictionary string and the merchant it came from. The id lets the holdout
 * cut by merchant, so an alias never straddles the split.
 */
interface DictionarySample {
  descriptor: string;
  category: string;
  merchantId: string;
  country: string | null;
}

/** One wanted-set per supported country, built once rather than per merchant. */
const COUNTRY_SCOPES: readonly (readonly [string, ReadonlySet<string>])[] =
  SUPPORTED_COUNTRIES.map((country) => [country, new Set([country])]);

/**
 * Read the dictionary artifact, yielding every distinct (string, category)
 * pair it carries once per country it trains under. Entries without a
 * resolvable category are Wikidata name-matching entries; they have no label
 * and cannot train anything.
 */
const readDictionaryArtifact = async (
  filePath: string,
  seen: Set<string>,
  out: DictionarySample[]
): Promise<void> => {
  const rl = createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: createReadStream(filePath).pipe(createGunzip()),
  });

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    let merchant: DictionaryMerchant;
    try {
      // SAFETY: each line is a JSON-serialised DictionaryMerchant from the build script
      merchant = JSON.parse(line) as DictionaryMerchant;
    } catch {
      continue;
    }

    if (!merchant.category) {
      continue;
    }
    // An artifact built before the hierarchy still spells its categories the
    // old way, so decode rather than reject — same rule as the runtime loader.
    const category = resolveCategorySlug(merchant.category);
    if (category === null) {
      continue;
    }

    // The country-less pass every connection with a null institution country
    // hits, plus each supported country whose scope this merchant falls in.
    const countries: (string | null)[] = [null];
    for (const [country, wanted] of COUNTRY_SCOPES) {
      if (isInCountryScope(merchant.countries, wanted)) {
        countries.push(country);
      }
    }

    const strings = [
      merchant.normalisedName,
      ...merchant.aliases.map((a) => a.normalisedAlias),
    ];

    for (const raw of strings) {
      // Re-normalise: aliases are normalised at build time, but the artifact
      // may predate a change to normaliseDescriptor.
      const descriptor = normaliseDescriptor(raw ?? "");
      if (descriptor.length === 0) {
        continue;
      }
      // Bind the string to the first merchant that claims it, then emit that
      // merchant's whole country set. Deduping per country instead would let
      // two merchants sharing a string split its variants between them, and a
      // string that straddles the merchant holdout is scored against weights
      // it helped train.
      const dedupe = `${descriptor}\u0000${category}`;
      if (seen.has(dedupe)) {
        continue;
      }
      seen.add(dedupe);
      for (const country of countries) {
        out.push({ category, country, descriptor, merchantId: merchant.id });
      }
    }
  }
};

/**
 * Dictionary samples for every supported country, plus a country-less copy for
 * connections whose institution country is null.
 */
const loadDictionarySamples = async (): Promise<DictionarySample[]> => {
  const artifact = path.resolve(DATA_DIR, "merchants.jsonl.gz");
  if (!existsSync(artifact)) {
    console.warn(`  no dictionary artifact at ${artifact} — skipping`);
    return [];
  }

  const samples: DictionarySample[] = [];
  await readDictionaryArtifact(artifact, new Set<string>(), samples);
  return samples;
};

/**
 * Bind parameters per statement. Postgres caps at 65535 and Prisma trips well
 * before that, so a query binds at most one user chunk plus one key chunk.
 */
const USER_CHUNK = 1000;
const KEY_CHUNK = 5000;

/**
 * Institution country per (user, merchant key). An override carries no country
 * of its own, so it trains with the country inference will pass: the one on the
 * connection the merchant was last seen through. Ordered by date then id so a
 * same-date tie resolves the same way on every run.
 */
const loadOverrideCountries = async (
  overrides: { merchantKey: string; userId: string }[]
): Promise<Map<string, string>> => {
  const countryByKey = new Map<string, string>();

  // Keys are grouped by their own user, so a query never carries the keys of
  // the users it is not asking about.
  const keysByUser = new Map<string, Set<string>>();
  for (const { merchantKey, userId } of overrides) {
    const keys = keysByUser.get(userId) ?? new Set<string>();
    keys.add(merchantKey);
    keysByUser.set(userId, keys);
  }

  const userIds = [...keysByUser.keys()];

  for (let u = 0; u < userIds.length; u += USER_CHUNK) {
    const userChunk = userIds.slice(u, u + USER_CHUNK);
    const merchantKeys = [
      ...new Set(userChunk.flatMap((id) => [...(keysByUser.get(id) ?? [])])),
    ];

    for (let k = 0; k < merchantKeys.length; k += KEY_CHUNK) {
      // eslint-disable-next-line no-await-in-loop -- chunked to bound bind parameters
      const rows = await prisma.transaction.findMany({
        orderBy: [{ date: "asc" }, { id: "asc" }],
        select: {
          account: {
            select: {
              connection: {
                select: { institutionCountry: true, userId: true },
              },
            },
          },
          merchantKey: true,
        },
        where: {
          account: { connection: { userId: { in: userChunk } } },
          merchantKey: { in: merchantKeys.slice(k, k + KEY_CHUNK) },
        },
      });

      for (const row of rows) {
        const { institutionCountry, userId } = row.account.connection;
        if (row.merchantKey === null || institutionCountry === null) {
          continue;
        }
        countryByKey.set(
          `${userId}\u0000${row.merchantKey}`,
          institutionCountry
        );
      }
    }
  }

  return countryByKey;
};

/** Source 2: user corrections — ground truth, weighted above the prior. */
const loadCorrectionSamples = async (): Promise<TrainingSample[]> => {
  const categoryIndex = buildCategoryIndex();
  const samples: TrainingSample[] = [];

  // MerchantOverride — user corrections on merchant keys
  // Row order feeds the seeded shuffle, so it must not vary between runs.
  const overrides = await prisma.merchantOverride.findMany({
    orderBy: { id: "asc" },
    select: { category: true, merchantKey: true, userId: true },
  });
  const countryByKey = await loadOverrideCountries(overrides);

  for (const override of overrides) {
    const normalised = normaliseDescriptor(override.merchantKey);
    if (normalised.length === 0) {
      continue;
    }

    const label = categoryIndex.get(override.category);
    if (label === undefined) {
      continue;
    }

    const country =
      countryByKey.get(`${override.userId}\u0000${override.merchantKey}`) ??
      null;
    const features = extractFeatures(
      modelInput(normalised, country),
      CONFIDENCE_DIMENSION
    );
    samples.push({ features, label, weight: CORRECTION_SAMPLE_WEIGHT });
  }

  // Transactions the user recategorised by hand
  const transactions = await prisma.transaction.findMany({
    orderBy: { id: "asc" },
    select: {
      account: {
        select: { connection: { select: { institutionCountry: true } } },
      },
      category: true,
      normalisedDescriptor: true,
    },
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
      modelInput(
        tx.normalisedDescriptor,
        tx.account.connection.institutionCountry
      ),
      CONFIDENCE_DIMENSION
    );
    samples.push({ features, label, weight: CORRECTION_SAMPLE_WEIGHT });
  }

  return samples;
};

// SGD logistic regression

interface TrainedModel {
  categories: string[];
  dimension: number;
  /** Representation these weights were trained against; the loader refuses a mismatch. */
  inputVersion: number;
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

  const random = rng(SHUFFLE_SEED);

  for (let epoch = 0; epoch < NUM_EPOCHS; epoch += 1) {
    shuffle(samples, random);
    let totalLoss = 0;
    let totalWeight = 0;

    for (const sample of samples) {
      const { features, label, weight: sampleWeight } = sample;
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
      totalLoss += -Math.log(Math.max(prob, 1e-15)) * sampleWeight;
      totalWeight += sampleWeight;

      // Backward: gradient update
      c = 0;
      for (const w of weights) {
        const logit = logits[c];
        if (logit === undefined) {
          throw new Error(`Missing logit for category ${c}`);
        }
        // gradient = (p_c - y_c) where y_c = 1 if c === label else 0,
        // scaled by the sample's authority
        const grad = (logit - (c === label ? 1 : 0)) * sampleWeight;

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

    const avgLoss = totalLoss / totalWeight;
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
    inputVersion: INPUT_VERSION,
    weights: sparseWeights,
  };
};

// Evaluation

/** Largest value fnv1a32 can return, plus one. */
const UINT32_RANGE = 4_294_967_296;

/**
 * Deterministic 0..1 draw from a string. The holdout split has to be stable
 * across runs and machines, so it hashes the merchant id rather than sampling.
 */
const unitHash = (text: string): number => fnv1a32(text) / UINT32_RANGE;

/** One operating point on the precision/coverage curve. */
interface OperatingPoint {
  threshold: number;
  /** Share of held-out samples predicted at or above this confidence. */
  coverage: number;
  /** Share of those predictions that are correct. */
  precision: number;
}

interface Evaluation {
  /** Share of scored holdout inputs whose top-1 prediction is correct. */
  accuracy: number;
  /** Share the majority category alone would get right. */
  baseline: number;
  /** The curve, so a bad operating point is visible rather than inferred. */
  curve: OperatingPoint[];
  /** The point the runtime actually applies. */
  runtime: OperatingPoint;
  /** Inputs in this country's slice — held-out strings, not merchants. */
  size: number;
}

/** Confidences reported alongside the runtime's own, for context. */
const REPORTED_THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95] as const;

const evaluate = (
  weights: Float64Array[],
  holdout: TrainingSample[],
  numCategories: number
): Evaluation => {
  const logits = new Float64Array(numCategories);
  const labelCounts = new Map<number, number>();
  let correct = 0;

  // Top-1 confidence and whether it was right, per held-out sample; the curve
  // is read off this rather than rescoring the holdout once per threshold.
  const confidences = new Float64Array(holdout.length);
  const hits = new Uint8Array(holdout.length);
  let n = 0;

  for (const { features, label } of holdout) {
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);

    let c = 0;
    for (const w of weights) {
      logits[c] = dotSparse(w, features.indices, features.values);
      c += 1;
    }
    softmax(logits);

    let best = 0;
    let bestProb = -1;
    let i = 0;
    for (const prob of logits) {
      if (prob > bestProb) {
        bestProb = prob;
        best = i;
      }
      i += 1;
    }

    const hit = best === label;
    if (hit) {
      correct += 1;
    }
    confidences[n] = bestProb;
    hits[n] = hit ? 1 : 0;
    n += 1;
  }

  let majority = 0;
  for (const count of labelCounts.values()) {
    if (count > majority) {
      majority = count;
    }
  }

  const size = holdout.length;

  const pointAt = (threshold: number): OperatingPoint => {
    let above = 0;
    let aboveCorrect = 0;
    for (let i = 0; i < size; i += 1) {
      if ((confidences[i] ?? 0) >= threshold) {
        above += 1;
        aboveCorrect += hits[i] ?? 0;
      }
    }
    return {
      coverage: above / size,
      precision: above === 0 ? 0 : aboveCorrect / above,
      threshold,
    };
  };

  return {
    accuracy: correct / size,
    baseline: majority / size,
    curve: REPORTED_THRESHOLDS.map(pointAt),
    runtime: pointAt(MODEL_ACCEPT_THRESHOLD),
    size,
  };
};

// Main

/** Dictionary samples divided into what trains the model and what scores it. */
interface MerchantSplit {
  /** Held-out inputs per inference country; each slice is gated on its own. */
  holdoutByCountry: Map<string, TrainingSample[]>;
  /** Distinct merchants behind the holdout strings, for honest reporting. */
  holdoutMerchants: number;
  training: TrainingSample[];
}

/**
 * Countries inference may pass for a held-out string. The runtime tags a
 * transaction with its connection's country, and an untrained `cc:` token still
 * collides into trained buckets, so each is scored separately.
 */
const INFERENCE_COUNTRIES: (string | null)[] = [null, ...SUPPORTED_COUNTRIES];

/** Label for a country slice in logs and the gate. */
const countryLabel = (country: string | null): string => country ?? "none";

/**
 * Split dictionary samples by merchant, so no alias straddles the split and the
 * holdout measures generalisation to an unseen merchant rather than recall.
 */
const splitByMerchant = (
  dictionary: DictionarySample[],
  categoryIndex: Map<string, number>
): MerchantSplit => {
  const holdoutByCountry = new Map<string, TrainingSample[]>(
    INFERENCE_COUNTRIES.map((c) => [countryLabel(c), []])
  );
  const training: TrainingSample[] = [];
  const heldOutMerchants = new Set<string>();
  // A descriptor already present under another country would otherwise be
  // scored once per shard as well as once per inference country.
  const scored = new Set<string>();

  for (const sample of dictionary) {
    const label = categoryIndex.get(sample.category);
    if (label === undefined) {
      continue;
    }

    if (unitHash(sample.merchantId) < HOLDOUT_FRACTION) {
      heldOutMerchants.add(sample.merchantId);
      const key = `${sample.descriptor}\u0000${sample.category}`;
      if (scored.has(key)) {
        continue;
      }
      scored.add(key);
      for (const country of INFERENCE_COUNTRIES) {
        holdoutByCountry.get(countryLabel(country))?.push({
          features: extractFeatures(
            modelInput(sample.descriptor, country),
            CONFIDENCE_DIMENSION
          ),
          label,
          weight: DICTIONARY_SAMPLE_WEIGHT,
        });
      }
      continue;
    }

    training.push({
      features: extractFeatures(
        modelInput(sample.descriptor, sample.country),
        CONFIDENCE_DIMENSION
      ),
      label,
      weight: DICTIONARY_SAMPLE_WEIGHT,
    });
  }

  return {
    holdoutByCountry,
    holdoutMerchants: heldOutMerchants.size,
    training,
  };
};

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const main = async (): Promise<void> => {
  const categoryIndex = buildCategoryIndex();

  console.log("Loading merchant dictionary...");
  const dictionary = await loadDictionarySamples();
  const { holdoutByCountry, holdoutMerchants, training } = splitByMerchant(
    dictionary,
    categoryIndex
  );
  const holdoutSize = [...holdoutByCountry.values()].reduce(
    (total, slice) => total + slice.length,
    0
  );
  console.log(
    `  ${dictionary.length} dictionary samples → ${training.length} train / ${holdoutMerchants} held-out merchants scored as ${holdoutSize} inputs`
  );

  let corrections: TrainingSample[] = [];
  if (DICTIONARY_ONLY) {
    console.log("Skipping user corrections (--dictionary-only)");
  } else {
    console.log("Loading user corrections...");
    corrections = await loadCorrectionSamples();
    console.log(`  ${corrections.length} corrections`);
  }

  const samples = [...training, ...corrections];

  // The holdout comes only from the dictionary, so without the artifact there
  // is nothing to score against and no model can be shown to be worth
  // shipping. Refuse before spending the epochs rather than discarding them.
  if (holdoutSize === 0) {
    console.error(
      "No holdout set — the dictionary artifact is missing, so the model cannot be evaluated and will not be written. Run `bun run build:data` first."
    );
    process.exitCode = 1;
    return;
  }

  if (samples.length < MIN_SAMPLES) {
    console.error(
      `Fewer than ${MIN_SAMPLES} training samples — nothing to train, no weights written.`
    );
    process.exitCode = 1;
    return;
  }

  const numCategories = SPENDING_CATEGORIES.length;

  console.log(
    `Training logistic regression: ${numCategories} categories, dimension=${CONFIDENCE_DIMENSION}, ${NUM_EPOCHS} epochs`
  );

  const weights = train(samples, numCategories, CONFIDENCE_DIMENSION);

  // Each country is gated on its own. Pooling would let a strong country-less
  // slice carry a weak FR one over the bar, and every user of a French
  // instance sees only the FR slice.
  let worst: { country: string; precision: number } | null = null;

  for (const [country, slice] of holdoutByCountry) {
    if (slice.length === 0) {
      continue;
    }
    const evaluation = evaluate(weights, slice, numCategories);
    console.log(
      `Holdout [country=${country}]: ${holdoutMerchants} merchants, ${evaluation.size} inputs`
    );
    console.log(`  top-1 accuracy      ${percent(evaluation.accuracy)}`);
    console.log(`  majority baseline   ${percent(evaluation.baseline)}`);
    console.log("  threshold  coverage  precision");
    for (const point of evaluation.curve) {
      console.log(
        `    ${point.threshold.toFixed(2)}       ${percent(point.coverage).padStart(6)}    ${percent(point.precision).padStart(6)}`
      );
    }
    const { precision, coverage } = evaluation.runtime;
    console.log(
      `  runtime @${MODEL_ACCEPT_THRESHOLD}: ${percent(coverage)} coverage, ${percent(precision)} precision`
    );

    if (worst === null || precision < worst.precision) {
      worst = { country, precision };
    }
  }

  // holdoutSize > 0 was checked before training, so at least one slice is
  // non-empty and the loop above always assigns worst.
  if (worst === null) {
    throw new Error("holdout is non-empty but no slice was evaluated");
  }

  if (worst.precision < MIN_PRECISION) {
    console.error(
      `Worst country slice (${worst.country}) has ${percent(worst.precision)} precision at the ${MODEL_ACCEPT_THRESHOLD} threshold the pipeline writes at, below the ${percent(MIN_PRECISION)} bar — refusing to write weights.`
    );
    console.error(
      "No weights file leaves the classifier inert, so these transactions stay uncategorised and correctable rather than being assigned a category that is probably wrong."
    );
    process.exitCode = EXIT_REFUSED;
    return;
  }

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

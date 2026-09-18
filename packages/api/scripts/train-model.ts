import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

import prisma from "@freenary/db";
import { Cause, Data, Effect, Option } from "effect";

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

interface TrainingSample {
  features: FeatureVector;
  label: number;
  gradientWeight: number;
}

interface DictionaryMerchant {
  id: string;
  name: string;
  normalisedName: string;
  category: string | null;
  countries?: string[];
  domains: string[];
  source: string;
  aliases: { alias: string; normalisedAlias: string }[];
}

interface DictionarySample {
  descriptor: string;
  category: string;
  merchantId: string;
  country: string | null;
}

interface TrainedModel {
  categories: string[];
  dimension: number;
  inputVersion: number;
  weights: Record<string, number>[];
}

interface OperatingPoint {
  threshold: number;
  coverage: number;
  precision: number;
}

interface Evaluation {
  top1Accuracy: number;
  majorityBaseline: number;
  curve: OperatingPoint[];
  runtimePoint: OperatingPoint;
  scoredInputs: number;
}

interface MerchantSplit {
  holdoutByCountry: Map<string, TrainingSample[]>;
  holdoutMerchantCount: number;
  training: TrainingSample[];
}

class TrainingAborted extends Data.TaggedError("TrainingAborted")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

type PrismaClient = typeof prisma;

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

const DICTIONARY_SAMPLE_WEIGHT = 1;
const CORRECTION_SAMPLE_WEIGHT = 20;

const HOLDOUT_FRACTION = 0.2;

const EXIT_FAILED = 1;
const EXIT_REFUSED_BY_SHIPPING_GATE = 2;

const DICTIONARY_ONLY = process.argv.includes("--dictionary-only");

const REPRODUCIBLE_SHUFFLE_SEED = 1_588_635_695;

const MIN_PRECISION_TO_SHIP = 0.75;

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
      throw new Error(
        `Feature vector out of range at position ${i} (bucket ${index})`
      );
    }

    sum += weight * value;
    i += 1;
  }

  return sum;
};

const softmax = (logits: Float64Array): Float64Array => {
  let maxLogit = -Infinity;

  for (const logit of logits) {
    if (logit > maxLogit) {
      maxLogit = logit;
    }
  }

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

const LEHMER_MODULUS = 2_147_483_647;
const LEHMER_MULTIPLIER = 16_807;

const lehmerRandom = (seed: number): (() => number) => {
  let state = seed % LEHMER_MODULUS;

  if (state <= 0) {
    state += LEHMER_MODULUS - 1;
  }

  return () => {
    state = (state * LEHMER_MULTIPLIER) % LEHMER_MODULUS;

    return (state - 1) / (LEHMER_MODULUS - 1);
  };
};

const shuffleInPlace = <T extends NonNullable<unknown>>(
  arr: T[],
  random: () => number
): T[] => {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = arr[i];
    const picked = arr[j];

    if (current === undefined || picked === undefined) {
      throw new Error(`Cannot shuffle an array with a hole at ${i} or ${j}`);
    }

    arr[i] = picked;
    arr[j] = current;
  }

  return arr;
};

const buildCategoryIndex = (): Map<string, number> => {
  const index = new Map<string, number>();

  for (const [i, category] of SPENDING_CATEGORIES.entries()) {
    index.set(category, i);
  }

  return index;
};

const COUNTRY_SCOPES: readonly (readonly [string, ReadonlySet<string>])[] =
  SUPPORTED_COUNTRIES.map((country) => [country, new Set([country])]);

// SAFETY: every artifact line is a JSON-serialised DictionaryMerchant written by build-merchant-dictionary.ts
const decodeDictionaryLine = Option.liftThrowable(
  (line: string): DictionaryMerchant => JSON.parse(line) as DictionaryMerchant
);

const trainingCountriesFor = (
  merchant: DictionaryMerchant
): (string | null)[] => {
  const countries: (string | null)[] = [null];

  for (const [country, wanted] of COUNTRY_SCOPES) {
    if (isInCountryScope(merchant.countries, wanted)) {
      countries.push(country);
    }
  }

  return countries;
};

const readDictionaryArtifact = async (
  filePath: string,
  claimedDescriptors: Set<string>,
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

    const decoded = decodeDictionaryLine(line);

    if (Option.isNone(decoded)) {
      continue;
    }

    const merchant = decoded.value;

    if (!merchant.category) {
      continue;
    }

    const category = resolveCategorySlug(merchant.category);

    if (category === null) {
      continue;
    }

    const countries = trainingCountriesFor(merchant);

    const strings = [
      merchant.normalisedName,
      ...merchant.aliases.map((a) => a.normalisedAlias),
    ];

    for (const raw of strings) {
      const descriptor = normaliseDescriptor(raw ?? "");

      if (descriptor.length === 0) {
        continue;
      }

      const claim = `${descriptor}\u0000${category}`;

      if (claimedDescriptors.has(claim)) {
        continue;
      }

      claimedDescriptors.add(claim);

      for (const country of countries) {
        out.push({ category, country, descriptor, merchantId: merchant.id });
      }
    }
  }
};

const loadDictionarySamples = Effect.gen(function* loadDictionarySamples() {
  const artifact = path.resolve(DATA_DIR, "merchants.jsonl.gz");
  const samples: DictionarySample[] = [];

  if (!existsSync(artifact)) {
    console.warn(`  no dictionary artifact at ${artifact} — skipping`);

    return samples;
  }

  yield* Effect.tryPromise({
    catch: (cause) =>
      new TrainingAborted({
        cause,
        message: `Cannot read the dictionary artifact at ${artifact}`,
      }),
    try: () => readDictionaryArtifact(artifact, new Set<string>(), samples),
  });

  return samples;
});

const USER_IDS_PER_QUERY = 1000;
const MERCHANT_KEYS_PER_QUERY = 5000;

const loadOverrideCountries = async (
  db: PrismaClient,
  overrides: { merchantKey: string; userId: string }[]
): Promise<Map<string, string>> => {
  const countryByKey = new Map<string, string>();

  const keysByUser = new Map<string, Set<string>>();

  for (const { merchantKey, userId } of overrides) {
    const keys = keysByUser.get(userId) ?? new Set<string>();
    keys.add(merchantKey);
    keysByUser.set(userId, keys);
  }

  const userIds = [...keysByUser.keys()];

  for (let u = 0; u < userIds.length; u += USER_IDS_PER_QUERY) {
    const userChunk = userIds.slice(u, u + USER_IDS_PER_QUERY);
    const merchantKeys = [
      ...new Set(userChunk.flatMap((id) => [...(keysByUser.get(id) ?? [])])),
    ];

    for (let k = 0; k < merchantKeys.length; k += MERCHANT_KEYS_PER_QUERY) {
      // eslint-disable-next-line no-await-in-loop -- chunked to bound bind parameters
      const rows = await db.transaction.findMany({
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
          merchantKey: {
            in: merchantKeys.slice(k, k + MERCHANT_KEYS_PER_QUERY),
          },
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

const loadMerchantOverrideSamples = Effect.fnUntraced(
  function* loadMerchantOverrideSamples(
    db: PrismaClient,
    categoryIndex: Map<string, number>
  ) {
    const overrides = yield* Effect.promise(() =>
      db.merchantOverride.findMany({
        orderBy: { id: "asc" },
        select: { category: true, merchantKey: true, userId: true },
      })
    );
    const countryByKey = yield* Effect.promise(() =>
      loadOverrideCountries(db, overrides)
    );
    const samples: TrainingSample[] = [];

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
      samples.push({
        features,
        gradientWeight: CORRECTION_SAMPLE_WEIGHT,
        label,
      });
    }

    return samples;
  }
);

const loadRecategorisedTransactionSamples = Effect.fnUntraced(
  function* loadRecategorisedTransactionSamples(
    db: PrismaClient,
    categoryIndex: Map<string, number>
  ) {
    const transactions = yield* Effect.promise(() =>
      db.transaction.findMany({
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
      })
    );
    const samples: TrainingSample[] = [];

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
      samples.push({
        features,
        gradientWeight: CORRECTION_SAMPLE_WEIGHT,
        label,
      });
    }

    return samples;
  }
);

const train = (
  samples: TrainingSample[],
  numCategories: number,
  dimension: number
): Float64Array[] => {
  const weightsPerCategory = Array.from(
    { length: numCategories },
    () => new Float64Array(dimension)
  );

  const logits = new Float64Array(numCategories);

  const random = lehmerRandom(REPRODUCIBLE_SHUFFLE_SEED);

  for (let epoch = 0; epoch < NUM_EPOCHS; epoch += 1) {
    shuffleInPlace(samples, random);
    let totalCrossEntropy = 0;
    let totalWeight = 0;

    for (const sample of samples) {
      const { features, label, gradientWeight: sampleWeight } = sample;
      const { indices, values } = features;

      let c = 0;

      for (const categoryWeights of weightsPerCategory) {
        logits[c] = dotSparse(categoryWeights, indices, values);
        c += 1;
      }

      softmax(logits);

      const prob = logits[label];

      if (prob === undefined) {
        throw new Error(
          `Sample label ${label} outside 0..${numCategories - 1}`
        );
      }

      totalCrossEntropy += -Math.log(Math.max(prob, 1e-15)) * sampleWeight;
      totalWeight += sampleWeight;

      c = 0;

      for (const categoryWeights of weightsPerCategory) {
        const logit = logits[c];

        if (logit === undefined) {
          throw new Error(`Missing logit for category ${c}`);
        }

        const gradient = (logit - (c === label ? 1 : 0)) * sampleWeight;

        let i = 0;

        for (const idx of indices) {
          const weight = categoryWeights[idx];
          const value = values[i];

          if (weight === undefined || value === undefined) {
            throw new Error(
              `Feature vector out of range at position ${i} (bucket ${idx})`
            );
          }

          categoryWeights[idx] =
            weight - LEARNING_RATE * (gradient * value + L2_LAMBDA * weight);
          i += 1;
        }

        c += 1;
      }
    }

    const avgLoss = totalCrossEntropy / totalWeight;
    console.log(
      `  epoch ${epoch + 1}/${NUM_EPOCHS}  loss=${avgLoss.toFixed(6)}`
    );
  }

  return weightsPerCategory;
};

const serialiseWeightsSparsely = (
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

const FNV1A32_RANGE = 4_294_967_296;

const stableUnitHash = (text: string): number => fnv1a32(text) / FNV1A32_RANGE;

const REPORTED_THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95] as const;

const evaluate = (
  weights: Float64Array[],
  holdout: TrainingSample[],
  numCategories: number
): Evaluation => {
  const logits = new Float64Array(numCategories);
  const labelCounts = new Map<number, number>();
  let correct = 0;

  const topConfidences = new Float64Array(holdout.length);
  const topPredictionWasCorrect = new Uint8Array(holdout.length);
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

    topConfidences[n] = bestProb;
    topPredictionWasCorrect[n] = hit ? 1 : 0;
    n += 1;
  }

  let majority = 0;

  for (const count of labelCounts.values()) {
    if (count > majority) {
      majority = count;
    }
  }

  const scoredInputs = holdout.length;

  const pointAt = (threshold: number): OperatingPoint => {
    let above = 0;
    let aboveCorrect = 0;

    for (let i = 0; i < scoredInputs; i += 1) {
      if ((topConfidences[i] ?? 0) >= threshold) {
        above += 1;
        aboveCorrect += topPredictionWasCorrect[i] ?? 0;
      }
    }

    return {
      coverage: above / scoredInputs,
      precision: above === 0 ? 0 : aboveCorrect / above,
      threshold,
    };
  };

  return {
    curve: REPORTED_THRESHOLDS.map(pointAt),
    majorityBaseline: majority / scoredInputs,
    runtimePoint: pointAt(MODEL_ACCEPT_THRESHOLD),
    scoredInputs,
    top1Accuracy: correct / scoredInputs,
  };
};

const INFERENCE_COUNTRIES: (string | null)[] = [null, ...SUPPORTED_COUNTRIES];

const countryLabel = (country: string | null): string => country ?? "none";

const splitByMerchant = (
  dictionary: DictionarySample[],
  categoryIndex: Map<string, number>
): MerchantSplit => {
  const holdoutByCountry = new Map<string, TrainingSample[]>(
    INFERENCE_COUNTRIES.map((c) => [countryLabel(c), []])
  );
  const training: TrainingSample[] = [];
  const heldOutMerchants = new Set<string>();
  const scoredDescriptors = new Set<string>();

  for (const sample of dictionary) {
    const label = categoryIndex.get(sample.category);

    if (label === undefined) {
      continue;
    }

    if (stableUnitHash(sample.merchantId) < HOLDOUT_FRACTION) {
      heldOutMerchants.add(sample.merchantId);
      const key = `${sample.descriptor}\u0000${sample.category}`;

      if (scoredDescriptors.has(key)) {
        continue;
      }

      scoredDescriptors.add(key);

      for (const country of INFERENCE_COUNTRIES) {
        holdoutByCountry.get(countryLabel(country))?.push({
          features: extractFeatures(
            modelInput(sample.descriptor, country),
            CONFIDENCE_DIMENSION
          ),
          gradientWeight: DICTIONARY_SAMPLE_WEIGHT,
          label,
        });
      }

      continue;
    }

    training.push({
      features: extractFeatures(
        modelInput(sample.descriptor, sample.country),
        CONFIDENCE_DIMENSION
      ),
      gradientWeight: DICTIONARY_SAMPLE_WEIGHT,
      label,
    });
  }

  return {
    holdoutByCountry,
    holdoutMerchantCount: heldOutMerchants.size,
    training,
  };
};

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const loadCorrectionSamples = Effect.fnUntraced(function* loadCorrectionSamples(
  db: PrismaClient,
  categoryIndex: Map<string, number>
) {
  if (DICTIONARY_ONLY) {
    console.log("Skipping user corrections (--dictionary-only)");

    return [];
  }

  console.log("Loading user corrections...");
  const fromOverrides = yield* loadMerchantOverrideSamples(db, categoryIndex);
  const fromTransactions = yield* loadRecategorisedTransactionSamples(
    db,
    categoryIndex
  );
  const corrections = [...fromOverrides, ...fromTransactions];
  console.log(`  ${corrections.length} corrections`);

  return corrections;
});

const reportCountrySlice = (
  evaluation: Evaluation,
  country: string,
  holdoutMerchantCount: number
): void => {
  console.log(
    `Holdout [country=${country}]: ${holdoutMerchantCount} merchants, ${evaluation.scoredInputs} inputs`
  );
  console.log(`  top-1 accuracy      ${percent(evaluation.top1Accuracy)}`);
  console.log(`  majority baseline   ${percent(evaluation.majorityBaseline)}`);
  console.log("  threshold  coverage  precision");

  for (const point of evaluation.curve) {
    console.log(
      `    ${point.threshold.toFixed(2)}       ${percent(point.coverage).padStart(6)}    ${percent(point.precision).padStart(6)}`
    );
  }

  const { precision, coverage } = evaluation.runtimePoint;
  console.log(
    `  runtime @${MODEL_ACCEPT_THRESHOLD}: ${percent(coverage)} coverage, ${percent(precision)} precision`
  );
};

const trainClassifier = Effect.fnUntraced(function* trainClassifier(
  db: PrismaClient
) {
  const categoryIndex = buildCategoryIndex();

  console.log("Loading merchant dictionary...");
  const dictionary = yield* loadDictionarySamples;
  const { holdoutByCountry, holdoutMerchantCount, training } = splitByMerchant(
    dictionary,
    categoryIndex
  );
  const holdoutSize = [...holdoutByCountry.values()].reduce(
    (total, slice) => total + slice.length,
    0
  );
  console.log(
    `  ${dictionary.length} dictionary samples → ${training.length} train / ${holdoutMerchantCount} held-out merchants scored as ${holdoutSize} inputs`
  );

  const corrections = yield* loadCorrectionSamples(db, categoryIndex);

  const samples = [...training, ...corrections];

  if (holdoutSize === 0) {
    console.error(
      "No holdout set — the dictionary artifact is missing, so the model cannot be evaluated and will not be written. Run `bun run build:data` first."
    );
    process.exitCode = EXIT_FAILED;

    return;
  }

  if (samples.length < MIN_SAMPLES) {
    console.error(
      `Fewer than ${MIN_SAMPLES} training samples — nothing to train, no weights written.`
    );
    process.exitCode = EXIT_FAILED;

    return;
  }

  const numCategories = SPENDING_CATEGORIES.length;

  console.log(
    `Training logistic regression: ${numCategories} categories, dimension=${CONFIDENCE_DIMENSION}, ${NUM_EPOCHS} epochs`
  );

  const weights = train(samples, numCategories, CONFIDENCE_DIMENSION);

  let worstCountrySlice: { country: string; precision: number } | null = null;

  for (const [country, slice] of holdoutByCountry) {
    if (slice.length === 0) {
      continue;
    }

    const evaluation = evaluate(weights, slice, numCategories);
    reportCountrySlice(evaluation, country, holdoutMerchantCount);

    const { precision } = evaluation.runtimePoint;

    if (worstCountrySlice === null || precision < worstCountrySlice.precision) {
      worstCountrySlice = { country, precision };
    }
  }

  if (worstCountrySlice === null) {
    return yield* new TrainingAborted({
      message: "holdout is non-empty but no country slice was evaluated",
    });
  }

  if (worstCountrySlice.precision < MIN_PRECISION_TO_SHIP) {
    console.error(
      `Worst country slice (${worstCountrySlice.country}) has ${percent(worstCountrySlice.precision)} precision at the ${MODEL_ACCEPT_THRESHOLD} threshold the pipeline writes at, below the ${percent(MIN_PRECISION_TO_SHIP)} bar — refusing to write weights.`
    );
    console.error(
      "No weights file leaves the classifier inert, so these transactions stay uncategorised and correctable rather than being assigned a category that is probably wrong."
    );
    process.exitCode = EXIT_REFUSED_BY_SHIPPING_GATE;

    return;
  }

  const model = serialiseWeightsSparsely(weights, CONFIDENCE_DIMENSION);

  yield* Effect.tryPromise({
    catch: (cause) =>
      new TrainingAborted({
        cause,
        message: `Cannot write model weights to ${OUTPUT_PATH}`,
      }),
    try: async () => {
      await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
      await writeFile(OUTPUT_PATH, JSON.stringify(model), "utf-8");
    },
  });

  console.log(`Wrote model weights to ${OUTPUT_PATH}`);
  console.log(
    `  samples=${samples.length}  epochs=${NUM_EPOCHS}  categories=${numCategories}`
  );
});

const connectedPrismaClient = Effect.acquireRelease(
  Effect.sync(() => prisma),
  (client) => Effect.promise(() => client.$disconnect())
);

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* runTraining() {
      const db = yield* connectedPrismaClient;

      yield* trainClassifier(db);
    })
  ).pipe(
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        console.error("Training failed:", Cause.squash(cause));
        process.exitCode = EXIT_FAILED;
      })
    )
  )
);

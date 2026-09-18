import { Option } from "effect";

import type { Iso3166Alpha2Country } from "./types";

export interface FeatureVector {
  indices: Uint32Array;
  values: Float32Array;
  dimension: number;
}

export const INPUT_VERSION = 2;

const DEFAULT_DIMENSION = 2 ** 16;

const DEFAULT_NGRAM_RANGE: [number, number] = [3, 5];

const FNV_OFFSET = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

export const fnv1a32 = (str: string): number => {
  let hash = FNV_OFFSET;

  for (let i = 0; i < str.length; i += 1) {
    // eslint-disable-next-line unicorn/prefer-code-point -- code points would change the hash for astral characters
    const code = str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise -- FNV-1a's mixing step is a XOR by definition
    hash ^= code;
    hash = Math.imul(hash, FNV_PRIME);
  }

  // eslint-disable-next-line no-bitwise -- coerces Math.imul's int32 result back to uint32
  return hash >>> 0;
};

const hashedFeatures = (
  normalisedDescriptor: string,
  dimension: number,
  minN: number,
  maxN: number
): FeatureVector => {
  const bucketCounts = new Map<number, number>();

  for (const token of normalisedDescriptor.split(" ")) {
    if (token.length === 0) {
      continue;
    }

    const boundedToken = `^${token}$`;

    for (let n = minN; n <= maxN; n += 1) {
      for (let start = 0; start <= boundedToken.length - n; start += 1) {
        const ngram = boundedToken.slice(start, start + n);
        const bucket = fnv1a32(ngram) % dimension;
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
      }
    }
  }

  const sortedBuckets = [...bucketCounts.keys()].toSorted((a, b) => a - b);
  const indices = new Uint32Array(sortedBuckets.length);
  const termFrequencies = new Float32Array(sortedBuckets.length);

  for (let i = 0; i < sortedBuckets.length; i += 1) {
    const bucket = sortedBuckets[i] ?? 0;
    indices[i] = bucket;
    termFrequencies[i] = bucketCounts.get(bucket) ?? 0;
  }

  return { dimension, indices, values: termFrequencies };
};

const hashedFeaturesOrNone = Option.liftThrowable(hashedFeatures);

export const extractFeatures = (
  normalisedDescriptor: string,
  dimension: number = DEFAULT_DIMENSION,
  ngramRange: [number, number] = DEFAULT_NGRAM_RANGE
): FeatureVector => {
  const [minN, maxN] = ngramRange;
  const extractable =
    normalisedDescriptor.length > 0 &&
    minN <= maxN &&
    minN >= 1 &&
    dimension >= 1;
  const features = extractable
    ? hashedFeaturesOrNone(normalisedDescriptor, dimension, minN, maxN)
    : Option.none<FeatureVector>();

  return Option.getOrElse(features, () => ({
    dimension,
    indices: new Uint32Array(0),
    values: new Float32Array(0),
  }));
};

export const modelInput = (
  normalisedDescriptor: string,
  country: Iso3166Alpha2Country | null | undefined
): string => {
  const code = country?.trim().toLowerCase();

  return code ? `cc:${code} ${normalisedDescriptor}` : normalisedDescriptor;
};

/**
 * Character n-gram feature extractor for the linear classifier.
 *
 * Uses the hashing trick (FNV-1a 32-bit) to map character n-grams to a
 * fixed-width sparse vector without needing a stored vocabulary. Each token
 * is wrapped with boundary markers (^…$) before n-gram extraction so the
 * model can learn prefix/suffix patterns.
 */

export interface FeatureVector {
  /** Sparse feature indices (hashed n-gram buckets). */
  indices: Uint32Array;
  /** Corresponding feature values (TF weights). */
  values: Float32Array;
  /** Total number of buckets in the hash space. */
  dimension: number;
}

/** 2^16 hash buckets. */
const DEFAULT_DIMENSION = 65_536;
const DEFAULT_NGRAM_RANGE: [number, number] = [3, 5];

const FNV_OFFSET = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

const fnv1a32 = (str: string): number => {
  let hash = FNV_OFFSET;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
};

/**
 * Extract hashed character n-gram features from a normalised descriptor.
 * Uses the hashing trick to map n-grams to a fixed-width vector without
 * needing a vocabulary. Suitable for a linear classifier.
 *
 * @param normalisedDescriptor - Output of normaliseDescriptor()
 * @param dimension - Number of hash buckets (default 2^16 = 65536)
 * @param ngramRange - [min, max] character n-gram sizes (default [3, 5])
 */
export const extractFeatures = (
  normalisedDescriptor: string,
  dimension: number = DEFAULT_DIMENSION,
  ngramRange: [number, number] = DEFAULT_NGRAM_RANGE
): FeatureVector => {
  try {
    const [minN, maxN] = ngramRange;

    if (
      normalisedDescriptor.length === 0 ||
      minN > maxN ||
      minN < 1 ||
      dimension < 1
    ) {
      return {
        dimension,
        indices: new Uint32Array(0),
        values: new Float32Array(0),
      };
    }

    const bucketCounts = new Map<number, number>();
    const tokens = normalisedDescriptor.split(" ");

    for (const token of tokens) {
      if (token.length === 0) {
        continue;
      }

      const wrapped = `^${token}$`;

      for (let n = minN; n <= maxN; n += 1) {
        for (let start = 0; start <= wrapped.length - n; start += 1) {
          const ngram = wrapped.slice(start, start + n);
          const bucket = fnv1a32(ngram) % dimension;
          bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
        }
      }
    }

    const sortedBuckets = [...bucketCounts.keys()].sort((a, b) => a - b);
    const indices = new Uint32Array(sortedBuckets.length);
    const values = new Float32Array(sortedBuckets.length);

    for (let i = 0; i < sortedBuckets.length; i += 1) {
      const bucket = sortedBuckets[i] ?? 0;
      indices[i] = bucket;
      values[i] = bucketCounts.get(bucket) ?? 0;
    }

    return { dimension, indices, values };
  } catch {
    return {
      dimension,
      indices: new Uint32Array(0),
      values: new Float32Array(0),
    };
  }
};

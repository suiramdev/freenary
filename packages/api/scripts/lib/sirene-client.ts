/**
 * Shared SIRENE API client with:
 *  - Slot-claiming rate limiter (7 req/s, the documented limit)
 *  - Bounded concurrency (5 in-flight requests)
 *  - Disk cache keyed by normalised query string
 *
 * Used by both fetch-wikidata-brands.ts and build-merchant-dictionary.ts.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

const SIRENE_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const USER_AGENT = "freenary-merchant-build/1.0 (https://freenary.com)";

/** API allows 7 req/s; 143ms is the minimum gap between request starts. */
const MIN_INTERVAL_MS = Math.ceil(1000 / 7);

/** Max concurrent in-flight HTTP requests. */
const MAX_CONCURRENCY = 5;

/** Disk cache directory (gitignored). */
const CACHE_DIR = path.resolve(import.meta.dirname, "../../.cache/sirene");

// ── Response schema ──────────────────────────────────────────────────────

// Only `results` is required: the SIRENE payload varies per establishment, and
// a stricter schema silently drops real matches instead of failing loudly.
const sireneEtablissementSchema = z.object({
  activite_principale: z.string().nullish(),
  nom_commercial: z.string().nullish(),
});

const sireneEntrySchema = z.object({
  matching_etablissements: z.array(sireneEtablissementSchema).default([]),
  nom_complet: z.string().nullish(),
  nom_raison_sociale: z.string().nullish(),
});

const sireneSearchResponseSchema = z.object({
  results: z.array(sireneEntrySchema).default([]),
});

type SireneSearchResponse = z.infer<typeof sireneSearchResponseSchema>;

const ensureCacheDir = (): void => {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
};

const cacheKey = (query: string): string => {
  const hash = createHash("sha256")
    .update(query.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);
  return path.join(CACHE_DIR, `${hash}.json`);
};

/** A cached body that no longer matches the schema still counts as answered. */
interface CacheHit {
  response: SireneSearchResponse | null;
}

const readCache = (query: string): CacheHit | null => {
  const file = cacheKey(query);
  if (!existsSync(file)) {
    return null;
  }
  try {
    const parsed = sireneSearchResponseSchema.safeParse(
      JSON.parse(readFileSync(file, "utf-8"))
    );
    return { response: parsed.success ? parsed.data : null };
  } catch {
    return null;
  }
};

/** Stores the response body verbatim, so a cache hit reparses what the API sent. */
const writeCache = (query: string, body: string): void => {
  try {
    writeFileSync(cacheKey(query), body);
  } catch {
    // Non-fatal: cache miss on next run is acceptable.
  }
};

const sleep = (ms: number): Promise<void> => {
  const { promise, resolve }: PromiseWithResolvers<void> =
    Promise.withResolvers();
  setTimeout(resolve, ms);
  return promise;
};

// ── Rate-limited concurrent fetcher ──────────────────────────────────────

interface SireneResult<T> {
  query: string;
  data: T | null;
}

interface IndexedResult<T> extends SireneResult<T> {
  idx: number;
}

/**
 * Fetches SIRENE search results for many queries concurrently, respecting
 * the 7 req/s rate limit and caching every response to disk.
 *
 * Rate limiting uses slot-claiming: each worker reserves the next available
 * time slot before awaiting, so concurrent workers naturally stagger even
 * when multiple resume in the same microtask batch.
 *
 * @param queries  The merchant names to search.
 * @param parse    Extracts a typed result from the response (return null to skip).
 * @param onProgress  Optional callback after each completed query.
 */
const fetchSireneBatch = async <T>(
  queries: string[],
  parse: (data: SireneSearchResponse, query: string) => T | null,
  onProgress?: (done: number, total: number) => void
): Promise<SireneResult<T>[]> => {
  ensureCacheDir();

  const results: SireneResult<T>[] = Array.from({ length: queries.length });
  let nextIndex = 0;
  let completed = 0;

  // Slot-claiming rate limiter: each worker bumps this before awaiting,
  // so even if multiple workers resume in the same tick they each get a
  // distinct future slot.
  let nextSlotTime = 0;

  const claimSlot = async (): Promise<void> => {
    const now = Date.now();
    const slot = Math.max(nextSlotTime, now);
    nextSlotTime = slot + MIN_INTERVAL_MS;
    const wait = slot - now;
    if (wait > 0) {
      await sleep(wait);
    }
  };

  const fetchOne = async (query: string): Promise<T | null> => {
    // Claim a rate-limit slot (synchronously reserves, then awaits).
    await claimSlot();

    try {
      const url = `${SIRENE_BASE}?q=${encodeURIComponent(query)}&page=1&per_page=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        return null;
      }

      const body = await res.text();
      writeCache(query, body);
      const parsed = sireneSearchResponseSchema.safeParse(JSON.parse(body));
      return parsed.success ? parse(parsed.data, query) : null;
    } catch {
      return null;
    }
  };

  const processQuery = async (
    idx: number,
    query: string
  ): Promise<IndexedResult<T>> => {
    const cached = readCache(query);
    if (cached !== null) {
      const data =
        cached.response === null ? null : parse(cached.response, query);
      return { data, idx, query };
    }
    return { data: await fetchOne(query), idx, query };
  };

  // Claims queries lazily: the consumer awaits each yielded promise before
  // pulling the next, so a worker keeps exactly one request in flight.
  const claimQueries = function* claimQueries(): Generator<
    Promise<IndexedResult<T>>
  > {
    while (nextIndex < queries.length) {
      const idx = nextIndex;
      nextIndex += 1;

      const query = queries[idx];
      if (query === undefined) {
        break;
      }

      yield processQuery(idx, query);
    }
  };

  const runWorker = async (): Promise<void> => {
    for await (const outcome of claimQueries()) {
      results[outcome.idx] = { data: outcome.data, query: outcome.query };
      completed += 1;
      onProgress?.(completed, queries.length);
    }
  };

  // Launch workers up to MAX_CONCURRENCY.
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENCY, queries.length) },
    () => runWorker()
  );
  await Promise.all(workers);

  return results;
};

export { fetchSireneBatch, type SireneResult, type SireneSearchResponse };

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

const SIRENE_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const USER_AGENT = "freenary-merchant-build/1.0 (https://freenary.com)";

/** API allows 7 req/s; minimum gap between request starts. */
const MIN_INTERVAL_MS = Math.ceil(1000 / 7); // 143ms

/** Max concurrent in-flight HTTP requests. */
const MAX_CONCURRENCY = 5;

/** Disk cache directory (gitignored). */
const CACHE_DIR = path.resolve(import.meta.dirname, "../../.cache/sirene");

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

const readCache = (query: string): unknown | null => {
  const file = cacheKey(query);
  if (!existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as unknown;
  } catch {
    return null;
  }
};

const writeCache = (query: string, data: unknown): void => {
  try {
    writeFileSync(cacheKey(query), JSON.stringify(data));
  } catch {
    // Non-fatal: cache miss on next run is acceptable.
  }
};

const sleep = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
};

// ── Rate-limited concurrent fetcher ──────────────────────────────────────

interface SireneResult<T> {
  query: string;
  data: T | null;
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
 * @param parse    Extracts a typed result from the raw JSON (return null to skip).
 * @param onProgress  Optional callback after each completed query.
 */
const fetchSireneBatch = async <T>(
  queries: string[],
  parse: (data: unknown, query: string) => T | null,
  onProgress?: (done: number, total: number) => void
): Promise<SireneResult<T>[]> => {
  ensureCacheDir();

  const results: SireneResult<T>[] = new Array(queries.length);
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

  const processOne = async (): Promise<void> => {
    while (nextIndex < queries.length) {
      const idx = nextIndex;
      nextIndex += 1;

      const query = queries[idx];
      if (query === undefined) {
        break;
      }

      // Check disk cache first.
      const cached = readCache(query);
      if (cached !== null) {
        results[idx] = { query, data: parse(cached, query) };
        completed += 1;
        onProgress?.(completed, queries.length);
        continue;
      }

      // Claim a rate-limit slot (synchronously reserves, then awaits).
      await claimSlot();

      try {
        const url = `${SIRENE_BASE}?q=${encodeURIComponent(query)}&page=1&per_page=1`;
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          results[idx] = { query, data: null };
        } else {
          const raw: unknown = await res.json();
          writeCache(query, raw);
          results[idx] = { query, data: parse(raw, query) };
        }
      } catch {
        results[idx] = { query, data: null };
      }

      completed += 1;
      onProgress?.(completed, queries.length);
    }
  };

  // Launch workers up to MAX_CONCURRENCY.
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENCY, queries.length) },
    () => processOne()
  );
  await Promise.all(workers);

  return results;
};

export { fetchSireneBatch, type SireneResult };

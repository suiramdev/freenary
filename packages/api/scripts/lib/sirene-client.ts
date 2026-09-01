/**
 * Shared SIRENE API client with:
 *  - Slot-claiming rate limiter (7 req/s, the documented limit)
 *  - Bounded concurrency (5 in-flight requests)
 *  - Disk cache keyed by normalised query string
 *  - A wall-clock budget and a failure circuit breaker, so a throttled or
 *    blackholing endpoint degrades the result instead of hanging the caller
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

/** Per-request ceiling; measured p95 is under 250ms, so this only trips on stalls. */
const REQUEST_TIMEOUT_MS = 10_000;

const TOO_MANY_REQUESTS = 429;

/** Backoff applied to every worker when the API throttles without Retry-After. */
const THROTTLE_BACKOFF_MS = 2000;

/**
 * Ceiling on a server-supplied Retry-After. A worker already inside `claimSlot`
 * is past the batch deadline check, so an unclamped delay would park all five
 * of them and blow the caller's wall-clock budget.
 */
const MAX_THROTTLE_BACKOFF_MS = 30_000;

/**
 * Parses a `Retry-After` delay in seconds. An absent header is `null`, which
 * `Number` would read as a zero-length backoff, so the fallback is explicit.
 */
const throttleBackoffMs = (retryAfter: string | null): number => {
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  if (!(Number.isFinite(seconds) && seconds > 0)) {
    return THROTTLE_BACKOFF_MS;
  }
  return Math.min(seconds * 1000, MAX_THROTTLE_BACKOFF_MS);
};

/**
 * Consecutive request failures that mean the endpoint has stopped answering
 * this host rather than choking on one query. Shared runner egress IPs get
 * throttled into silence, and 5 workers × a 10s timeout each grinds at
 * 0.5 req/s — slower than useless, so the batch stops instead.
 */
const FAILURE_STREAK_LIMIT = 25;

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

interface SireneBatchOptions {
  /** Wall-clock budget for the whole batch. Omit for no limit. */
  budgetMs?: number;
  onProgress?: (done: number, total: number) => void;
}

/** Why the batch ended, so the caller can report partial enrichment honestly. */
type SireneStopReason = "complete" | "budget" | "failures";

interface SireneBatchOutcome<T> {
  /** Only the queries that were actually answered, in input order. */
  results: SireneResult<T>[];
  stop: SireneStopReason;
  /** Answered from the disk cache, costing no request. */
  cached: number;
  /** Requests that yielded no answer: non-2xx, timeout, or transport error. */
  failed: number;
  /** Queries never attempted because the batch ended early. */
  skipped: number;
}

/**
 * Fetches SIRENE search results for many queries concurrently, respecting
 * the 7 req/s rate limit and caching every response to disk.
 *
 * Rate limiting uses slot-claiming: each worker reserves the next available
 * time slot before awaiting, so concurrent workers naturally stagger even
 * when multiple resume in the same microtask batch.
 *
 * The batch stops early on `budgetMs` or on a long failure streak, and reports
 * which happened; a caller that needs every answer must check `stop`.
 *
 * @param queries  The merchant names to search.
 * @param parse    Extracts a typed result from the response (return null to skip).
 * @param options  Wall-clock budget and progress callback.
 */
const fetchSireneBatch = async <T>(
  queries: string[],
  parse: (data: SireneSearchResponse, query: string) => T | null,
  options: SireneBatchOptions = {}
): Promise<SireneBatchOutcome<T>> => {
  ensureCacheDir();

  const { budgetMs, onProgress } = options;
  const deadline =
    budgetMs === undefined ? Number.POSITIVE_INFINITY : Date.now() + budgetMs;

  const settled: (SireneResult<T> | undefined)[] = Array.from({
    length: queries.length,
  });
  let nextIndex = 0;
  let completed = 0;
  let cached = 0;
  let failed = 0;
  let failureStreak = 0;
  let stop: SireneStopReason = "complete";

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

  const fetchOne = async (
    query: string
  ): Promise<{ answered: boolean; data: T | null }> => {
    // Claim a rate-limit slot (synchronously reserves, then awaits).
    await claimSlot();

    try {
      const url = `${SIRENE_BASE}?q=${encodeURIComponent(query)}&page=1&per_page=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        // Being throttled means every in-flight worker is too fast, so push the
        // shared slot clock rather than retrying this one query.
        if (res.status === TOO_MANY_REQUESTS) {
          nextSlotTime = Math.max(
            nextSlotTime,
            Date.now() + throttleBackoffMs(res.headers.get("retry-after"))
          );
        }
        return { answered: false, data: null };
      }

      const body = await res.text();
      writeCache(query, body);
      const parsed = sireneSearchResponseSchema.safeParse(JSON.parse(body));
      return {
        answered: true,
        data: parsed.success ? parse(parsed.data, query) : null,
      };
    } catch {
      return { answered: false, data: null };
    }
  };

  const processQuery = async (
    idx: number,
    query: string
  ): Promise<IndexedResult<T> | null> => {
    const hit = readCache(query);
    if (hit !== null) {
      cached += 1;
      const data = hit.response === null ? null : parse(hit.response, query);
      return { data, idx, query };
    }

    const outcome = await fetchOne(query);
    if (outcome.answered) {
      failureStreak = 0;
      return { data: outcome.data, idx, query };
    }

    failed += 1;
    failureStreak += 1;
    // Only worth reporting while queries remain: a failing tail of an otherwise
    // complete batch stopped nothing. An in-flight failure must also not
    // relabel a stop the deadline already caused.
    if (
      failureStreak >= FAILURE_STREAK_LIMIT &&
      stop === "complete" &&
      nextIndex < queries.length
    ) {
      stop = "failures";
    }
    // A failed request answered nothing; recording null would cache a miss the
    // endpoint never confirmed.
    return null;
  };

  // Claims queries lazily: the consumer awaits each yielded promise before
  // pulling the next, so a worker keeps exactly one request in flight.
  const claimQueries = function* claimQueries(): Generator<
    Promise<IndexedResult<T> | null>
  > {
    while (nextIndex < queries.length) {
      if (stop === "failures") {
        return;
      }
      if (Date.now() >= deadline) {
        stop = "budget";
        return;
      }

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
      if (outcome !== null) {
        settled[outcome.idx] = { data: outcome.data, query: outcome.query };
      }
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

  const results = settled.filter(
    (entry): entry is SireneResult<T> => entry !== undefined
  );

  return {
    cached,
    failed,
    results,
    skipped: queries.length - completed,
    stop,
  };
};

export {
  fetchSireneBatch,
  type SireneBatchOutcome,
  type SireneResult,
  type SireneSearchResponse,
};

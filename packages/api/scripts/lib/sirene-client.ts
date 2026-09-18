import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Data, Effect, Option } from "effect";
import { z } from "zod";

interface CachedAnswer {
  usableResponse: SireneSearchResponse | null;
}

interface SireneResult<T> {
  query: string;
  data: T | null;
}

interface SireneBatchOptions {
  budgetMs?: number;
  onProgress?: (done: number, total: number) => void;
}

interface SireneBatchOutcome<T> {
  results: SireneResult<T>[];
  stop: SireneStopReason;
  cached: number;
  failed: number;
  skipped: number;
}

type SireneStopReason = "complete" | "budget" | "failures";

type SireneUnansweredReason =
  | { readonly kind: "request-failed"; readonly cause: unknown }
  | { readonly kind: "response-rejected"; readonly status: number }
  | { readonly kind: "body-unreadable"; readonly cause: unknown }
  | { readonly kind: "body-undecodable"; readonly cause: unknown };

class SireneQueryUnanswered extends Data.TaggedError("SireneQueryUnanswered")<{
  readonly query: string;
  readonly reason: SireneUnansweredReason;
}> {}

const SIRENE_BASE = "https://recherche-entreprises.api.gouv.fr/search";
const USER_AGENT = "freenary-merchant-build/1.0 (https://freenary.com)";

const DOCUMENTED_REQUESTS_PER_SECOND = 7;
const MIN_INTERVAL_MS = Math.ceil(1000 / DOCUMENTED_REQUESTS_PER_SECOND);

const MAX_CONCURRENCY = 5;

const REQUEST_TIMEOUT_MS = 10_000;

const TOO_MANY_REQUESTS = 429;

const BACKOFF_WITHOUT_RETRY_AFTER_MS = 2000;

const MAX_SERVER_REQUESTED_BACKOFF_MS = 30_000;

const throttleBackoffMs = (retryAfter: string | null): number => {
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);

  if (!(Number.isFinite(seconds) && seconds > 0)) {
    return BACKOFF_WITHOUT_RETRY_AFTER_MS;
  }

  return Math.min(seconds * 1000, MAX_SERVER_REQUESTED_BACKOFF_MS);
};

const ENDPOINT_HAS_STOPPED_ANSWERING_AFTER_FAILURES = 25;

const CACHE_DIR = path.resolve(import.meta.dirname, "../../.cache/sirene");

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

const decodeCacheFile = Option.liftThrowable(
  (file: string): SireneSearchResponse | null => {
    const parsed = sireneSearchResponseSchema.safeParse(
      JSON.parse(readFileSync(file, "utf-8"))
    );

    return parsed.success ? parsed.data : null;
  }
);

const readCache = (query: string): Option.Option<CachedAnswer> => {
  const file = cacheKey(query);

  if (!existsSync(file)) {
    return Option.none();
  }

  return Option.map(decodeCacheFile(file), (usableResponse) => ({
    usableResponse,
  }));
};

const writeCacheFile = Option.liftThrowable(
  (file: string, body: string): void => {
    writeFileSync(file, body);
  }
);

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
  let claimed = 0;
  let completed = 0;
  let cached = 0;
  let failed = 0;
  let failureStreak = 0;
  let stop: SireneStopReason = "complete";
  let nextSlotTime = 0;

  const claimRateLimitSlot = Effect.suspend(() => {
    const now = Date.now();
    const slot = Math.max(nextSlotTime, now);
    nextSlotTime = slot + MIN_INTERVAL_MS;
    const wait = slot - now;

    return wait > 0 ? Effect.sleep(wait) : Effect.void;
  });

  const fetchOne = Effect.fnUntraced(function* fetchOne(query: string) {
    yield* claimRateLimitSlot;

    const url = `${SIRENE_BASE}?q=${encodeURIComponent(query)}&page=1&per_page=1`;
    const response = yield* Effect.tryPromise({
      catch: (cause) =>
        new SireneQueryUnanswered({
          query,
          reason: { cause, kind: "request-failed" },
        }),
      try: () =>
        fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
    });

    if (!response.ok) {
      if (response.status === TOO_MANY_REQUESTS) {
        nextSlotTime = Math.max(
          nextSlotTime,
          Date.now() + throttleBackoffMs(response.headers.get("retry-after"))
        );
      }

      return yield* new SireneQueryUnanswered({
        query,
        reason: { kind: "response-rejected", status: response.status },
      });
    }

    const body = yield* Effect.tryPromise({
      catch: (cause) =>
        new SireneQueryUnanswered({
          query,
          reason: { cause, kind: "body-unreadable" },
        }),
      try: () => response.text(),
    });

    Option.getOrUndefined(writeCacheFile(cacheKey(query), body));

    return yield* Effect.try({
      catch: (cause) =>
        new SireneQueryUnanswered({
          query,
          reason: { cause, kind: "body-undecodable" },
        }),
      try: (): T | null => {
        const parsed = sireneSearchResponseSchema.safeParse(JSON.parse(body));

        return parsed.success ? parse(parsed.data, query) : null;
      },
    });
  });

  const processQuery = Effect.fnUntraced(function* processQuery(
    query: string,
    idx: number
  ) {
    if (stop === "failures") {
      return;
    }

    if (Date.now() >= deadline) {
      stop = "budget";

      return;
    }

    claimed += 1;

    const hit = readCache(query);

    if (Option.isSome(hit)) {
      const { usableResponse } = hit.value;
      cached += 1;
      settled[idx] = {
        data: usableResponse === null ? null : parse(usableResponse, query),
        query,
      };
    } else {
      const answer = yield* Effect.option(fetchOne(query));

      if (Option.isSome(answer)) {
        failureStreak = 0;
        settled[idx] = { data: answer.value, query };
      } else {
        failed += 1;
        failureStreak += 1;

        if (
          failureStreak >= ENDPOINT_HAS_STOPPED_ANSWERING_AFTER_FAILURES &&
          stop === "complete" &&
          claimed < queries.length
        ) {
          stop = "failures";
        }
      }
    }

    completed += 1;
    onProgress?.(completed, queries.length);
  });

  await Effect.runPromise(
    Effect.forEach(queries, processQuery, {
      concurrency: MAX_CONCURRENCY,
      discard: true,
    })
  );

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

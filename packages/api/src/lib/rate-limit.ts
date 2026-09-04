import { auth } from "@freenary/auth";
import prisma from "@freenary/db";
import { ORPCError } from "@orpc/server";
import { getIP } from "better-auth/api";

interface RateLimitRule {
  max: number;
  window: number;
}

interface CountRow {
  count: number;
}

/**
 * Better Auth's own resolution, not a second guess at it: it reads only the
 * configured header, refuses a multi-hop chain unless the hops are trusted
 * proxies, validates the address and collapses IPv6 to a subnet. A caller it
 * cannot place shares one bucket rather than minting a fresh one per request,
 * which is what a spoofable leftmost-hop read would allow.
 */
export const callerBucket = (headers: Headers): string =>
  getIP(headers, auth.options) ?? "untrusted";

/**
 * Counts one request against a fixed window, in the same table Better Auth's
 * limiter uses, so a restart cannot clear a lockout. One statement: the read,
 * the window reset and the increment have to be atomic or concurrent callers
 * all pass a stale count.
 */
export const consumeRateLimit = async (
  key: string,
  rule: RateLimitRule
): Promise<void> => {
  const now = Date.now();
  const windowStart = now - rule.window * 1000;

  const rows = await prisma.$queryRaw<CountRow[]>`
    INSERT INTO "rate_limit" ("id", "key", "count", "lastRequest")
    VALUES (${crypto.randomUUID()}, ${key}, 1, ${BigInt(now)})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit"."lastRequest" < ${BigInt(windowStart)} THEN 1
        ELSE "rate_limit"."count" + 1
      END,
      "lastRequest" = CASE
        WHEN "rate_limit"."lastRequest" < ${BigInt(windowStart)} THEN ${BigInt(now)}
        ELSE "rate_limit"."lastRequest"
      END
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;
  if (count > rule.max) {
    throw new ORPCError("TOO_MANY_REQUESTS");
  }
};

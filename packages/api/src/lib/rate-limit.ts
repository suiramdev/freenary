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

const BUCKET_FOR_A_CALLER_BETTER_AUTH_CANNOT_PLACE = "untrusted";

export const callerBucket = (headers: Headers): string =>
  getIP(headers, auth.options) ?? BUCKET_FOR_A_CALLER_BETTER_AUTH_CANNOT_PLACE;

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

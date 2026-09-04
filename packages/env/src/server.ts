import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    BANKING_PROVIDER: z.enum(["powens", "enable-banking"]).default("powens"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .default("dev_secret_change_me_at_least_32chars"),
    // Follows PORT so a second worktree's auth callbacks never point at the first.
    // Safe to interpolate raw process.env.PORT: the PORT schema below only
    // accepts decimal digits. `||` not `??`: a declared-but-blank PORT= must
    // fall through, matching this object's emptyStringAsUndefined contract.
    BETTER_AUTH_URL: z
      .url()
      .default(`http://localhost:${process.env.PORT || 3000}`),
    CORS_ORIGIN: z.url().default("http://localhost:3001"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://postgres:password@localhost:5432/freenary"),
    ENABLE_BANKING_APP_ID: z.string().optional(),
    ENABLE_BANKING_PRIVATE_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /** Lets a second checkout or worktree run its own stack alongside the default. */
    // Digits only, so the raw value above can be interpolated into a valid URL
    // before any coercion, and the bound keeps Bun.serve's RangeError away.
    PORT: z
      .string()
      .regex(/^\d+$/u, "PORT must be a decimal number between 1 and 65535")
      .transform(Number)
      .pipe(z.number().int().positive().max(65_535))
      .default(3000),
    POWENS_CLIENT_ID: z.string().optional(),
    POWENS_CLIENT_SECRET: z.string().optional(),
    /** Powens API domain, e.g. "acme-sandbox"; a trailing ".biapi.pro" is tolerated. */
    POWENS_DOMAIN: z.string().optional(),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

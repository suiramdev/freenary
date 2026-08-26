import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).default("postgresql://postgres:password@localhost:5432/freenary"),
    BETTER_AUTH_SECRET: z.string().min(32).default("dev_secret_change_me_at_least_32chars"),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    CORS_ORIGIN: z.url().default("http://localhost:3001"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

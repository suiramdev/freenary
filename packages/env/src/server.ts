import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const IPV4_MAPPED_IPV6_PREFIX = /^::ffff:/iu;
const DEFAULT_PORT = 3000;
const declaredPort = process.env.PORT || DEFAULT_PORT;

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    AI_API_KEY: z
      .string()
      .optional()
      .describe(
        "OpenAI-compatible chat-completions API key. Omit for a local endpoint that needs none."
      ),
    AI_BASE_URL: z
      .url()
      .optional()
      .describe(
        "OpenAI-compatible base URL, e.g. https://openrouter.ai/api/v1 or http://ollama:11434/v1."
      ),
    AI_MODEL: z
      .string()
      .optional()
      .describe(
        "Model id as the endpoint names it, e.g. anthropic/claude-3.5-sonnet or qwen2.5:14b."
      ),
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_CLIENT_SECRET: z.string().optional(),
    AUTH_COOKIE_DOMAIN: z
      .string()
      .optional()
      .describe(
        "Parent domain shared by the API and the web app, e.g. .example.com. Set it when they sit on different subdomains: it is what lets the session cookie stay SameSite=Lax instead of dropping to None."
      ),
    AUTH_PASSWORD_BREACH_CHECK: z
      .stringbool()
      .default(true)
      .describe(
        "Check new passwords against Have I Been Pwned's k-anonymity range API. Only a SHA-1 prefix leaves the server, and an air-gapped deployment has no route to it at all, so it stays switchable."
      ),
    BANKING_PROVIDER: z.enum(["powens", "enable-banking"]).default("powens"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .default("dev_secret_change_me_at_least_32chars"),
    BETTER_AUTH_URL: z
      .url()
      .default(`http://localhost:${declaredPort}`)
      .describe(
        "Public origin of this API. Follows PORT so a second worktree's auth callbacks never point at the first."
      ),
    CORS_ORIGIN: z.url().default("http://localhost:3001"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://postgres:password@localhost:5432/freenary"),
    EMAIL_FROM: z
      .string()
      .optional()
      .describe(
        "Envelope sender for every message the app sends, e.g. Freenary <no-reply@example.com>."
      ),
    EMAIL_PROVIDER: z
      .enum(["log", "resend", "smtp"])
      .optional()
      .describe(
        "Which email adapter to use. Unset means no email provider is connected."
      ),
    ENABLE_BANKING_APP_ID: z.string().optional(),
    ENABLE_BANKING_PRIVATE_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),
    OIDC_DISCOVERY_URL: z
      .url()
      .optional()
      .describe(
        "OpenID Connect discovery document, e.g. https://idp.example.com/.well-known/openid-configuration."
      ),
    OIDC_PROVIDER_NAME: z
      .string()
      .optional()
      .describe(
        'Shown on the sign-in button; unset renders a translated "single sign-on".'
      ),
    OIDC_SCOPES: z
      .string()
      .optional()
      .describe("Comma-separated; openid email profile is always requested."),
    PORT: z
      .string()
      .regex(/^\d+$/u, "PORT must be a decimal number between 1 and 65535")
      .transform(Number)
      .pipe(z.number().int().positive().max(65_535))
      .default(DEFAULT_PORT)
      .describe(
        "Lets a second checkout or worktree run its own stack alongside the default. Digits only, so the raw value can be interpolated into BETTER_AUTH_URL before any coercion."
      ),
    POWENS_CLIENT_ID: z.string().optional(),
    POWENS_CLIENT_SECRET: z.string().optional(),
    POWENS_DOMAIN: z
      .string()
      .optional()
      .describe(
        'Powens API domain, e.g. "acme-sandbox"; a trailing ".biapi.pro" is tolerated.'
      ),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().max(65_535).optional(),
    SMTP_SECURE: z
      .stringbool()
      .default(false)
      .describe("Implicit TLS (port 465). Leave off for STARTTLS on 587."),
    SMTP_USER: z.string().optional(),
    TRANSACTION_CLASSIFIER: z
      .enum(["jev"])
      .optional()
      .describe(
        "Which classifier resolves merchants no deterministic stage knows. Unset means no model is called and such transactions stay uncategorised."
      ),
    TRUSTED_PROXIES: z
      .string()
      .optional()
      .transform((value) =>
        value
          ?.split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      )
      .pipe(
        z
          .array(
            z
              .union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()])
              .refine((entry) => !IPV4_MAPPED_IPV6_PREFIX.test(entry), {
                error:
                  "write an IPv4-mapped address in its IPv4 form, e.g. 10.0.0.0/24",
              })
          )
          .optional()
      )
      .describe(
        "Reverse-proxy addresses or CIDR ranges in front of this server, e.g. 10.0.0.0/24,192.0.2.10. Rate limits key on the caller's address, and without this list Better Auth counts every caller into one shared bucket. An entry it cannot parse has the same effect, so a typo is refused here at startup."
      ),
    TYPESAFE_API_KEY: z.string().optional(),
    TYPESAFE_MODEL: z
      .string()
      .default("jev-latest")
      .describe(
        "TypeSafe model id or alias sent as `model`; part of the classification cache key."
      ),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

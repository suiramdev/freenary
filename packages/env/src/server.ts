import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** `::ffff:` in any case, the only IPv4-mapped IPv6 prefix in practice. */
const IPV4_MAPPED = /^::ffff:/iu;

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_CLIENT_SECRET: z.string().optional(),
    /**
     * Parent domain shared by the API and the web app, e.g. `.example.com`.
     * Set it when they sit on different subdomains: it is what lets the session
     * cookie stay `SameSite=Lax` instead of dropping to `None`.
     */
    AUTH_COOKIE_DOMAIN: z.string().optional(),
    /**
     * Check new passwords against Have I Been Pwned's k-anonymity range API.
     * Only a SHA-1 prefix leaves the server, but an air-gapped deployment has
     * no route to it at all, so it stays switchable.
     */
    AUTH_PASSWORD_BREACH_CHECK: z.stringbool().default(true),
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
    /** Envelope sender for every message the app sends, e.g. `Freenary <no-reply@example.com>`. */
    EMAIL_FROM: z.string().optional(),
    /** Which email adapter to use. Unset means no email provider is connected. */
    EMAIL_PROVIDER: z.enum(["log", "resend", "smtp"]).optional(),
    ENABLE_BANKING_APP_ID: z.string().optional(),
    ENABLE_BANKING_PRIVATE_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),
    /** OpenID Connect discovery document, e.g. `https://idp.example.com/.well-known/openid-configuration`. */
    OIDC_DISCOVERY_URL: z.url().optional(),
    /** Shown on the sign-in button; unset renders a translated "single sign-on". */
    OIDC_PROVIDER_NAME: z.string().optional(),
    /** Comma-separated; `openid email profile` is always requested. */
    OIDC_SCOPES: z.string().optional(),
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
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().max(65_535).optional(),
    /** Implicit TLS (port 465). Leave off for STARTTLS on 587. */
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().optional(),
    /**
     * Reverse-proxy addresses or CIDR ranges in front of this server, e.g.
     * `10.0.0.0/24,192.0.2.10`. Rate limits key on the caller's address, and
     * without this list Better Auth refuses a multi-hop `x-forwarded-for` and
     * counts every caller into one shared bucket — which caps the deployment
     * rather than the caller.
     */
    TRUSTED_PROXIES: z
      .string()
      .optional()
      .transform((value) =>
        value
          ?.split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      )
      // Better Auth drops an entry it cannot parse and then treats the chain as
      // unresolvable, which silently reinstates the single shared bucket this
      // variable exists to prevent — so a typo has to fail at startup instead.
      .pipe(
        z
          .array(
            z
              .union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()])
              // Better Auth collapses an IPv4-mapped address to four bytes and
              // then rejects any prefix above /32, so these parse here and are
              // dropped there. Refusing the whole `::ffff:` form is wider than
              // that — some are entries it would accept — but the plain IPv4
              // form is equivalent and never silently dropped. The fully
              // uncompressed `0:0:0:0:0:ffff:…` spelling still slips through;
              // nobody writes it by hand, and the shorthand catches the case.
              .refine((entry) => !IPV4_MAPPED.test(entry), {
                error:
                  "write an IPv4-mapped address in its IPv4 form, e.g. 10.0.0.0/24",
              })
          )
          .optional()
      ),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

import { z } from "zod";

const IPV4_MAPPED_IPV6_PREFIX = /^::ffff:/iu;
const DEFAULT_PORT = 3000;

export const declaredPort = process.env.PORT || DEFAULT_PORT;

const isProduction = process.env.NODE_ENV === "production";

const devDefault = <Schema extends z.ZodType>(
  schema: Schema,
  value: z.core.util.NoUndefined<z.output<Schema>>
) => (isProduction ? schema : schema.default(value));

export const serverEnvSchema = {
  AI_API_KEY: z
    .string()
    .optional()
    .describe("The key for that endpoint.")
    .meta({
      example: "sk-...",
      onError: "Unset is valid, because a local endpoint needs no key.",
      secret: true,
      section: "assistant",
    }),
  AI_BASE_URL: z
    .url()
    .optional()
    .describe(
      "The base URL of the chat-completions endpoint, with its version path."
    )
    .meta({
      example: "https://openrouter.ai/api/v1",
      onError:
        "A value that is not a URL stops the start. Unset means the instance reports no server model.",
      section: "assistant",
    }),
  AI_MODEL: z
    .string()
    .optional()
    .describe("The model id as the endpoint names it.")
    .meta({
      example: "anthropic/claude-3.5-sonnet",
      onError:
        "It needs `AI_BASE_URL` too. With either one unset, the assistant route answers `503 unconfigured`.",
      section: "assistant",
    }),
  APPLE_APP_BUNDLE_IDENTIFIER: z
    .string()
    .optional()
    .describe("Sets the Apple identity-token audience.")
    .meta({
      example: "com.example.freenary",
      onError:
        "Alone it does nothing, because it is a field of the Apple provider.",
      section: "sign-in",
    }),
  APPLE_CLIENT_ID: z
    .string()
    .optional()
    .describe("With `APPLE_CLIENT_SECRET`, it adds the Apple button.")
    .meta({
      example: "com.example.freenary",
      onError: "Alone it adds nothing.",
      section: "sign-in",
    }),
  APPLE_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("With `APPLE_CLIENT_ID`, it adds the Apple button.")
    .meta({
      example: "eyJhbGciOiJFUzI1NiIsImtpZCI6...",
      onError: "Alone it adds nothing.",
      secret: true,
      section: "sign-in",
    }),
  AUTH_COOKIE_DOMAIN: z
    .string()
    .optional()
    .describe(
      "The parent domain the API server and the web app share, for example `.example.com`. It keeps the session cookie at `SameSite=Lax` and adds `Domain`."
    )
    .meta({
      example: ".example.com",
      onError:
        "Three shapes stop the start: a trailing dot, a single label, and a domain that is not a parent of both hostnames. Unset with two hostnames drops the cookie to `SameSite=None`.",
      section: "origins",
    }),
  AUTH_PASSWORD_BREACH_CHECK: z
    .stringbool()
    .default(true)
    .describe("`true` checks each new password against Have I Been Pwned.")
    .meta({
      example: "true",
      onError:
        "`false` drops the check. A value that is not a boolean string stops the start.",
      section: "sign-in",
    }),
  BANKING_PROVIDER: z
    .enum(["powens", "enable-banking"])
    .default("powens")
    .describe(
      "Picks the provider a new bank connection uses: `powens` or `enable-banking`."
    )
    .meta({
      example: "powens",
      onError: "Any other value stops the start.",
      section: "bank",
    }),
  BETTER_AUTH_SECRET: devDefault(
    z.string().min(32),
    "dev_secret_change_me_at_least_32chars"
  )
    .describe(
      "Signs session cookies, encrypts two-factor secrets and backup codes, and signs the bank connection state."
    )
    .meta({
      envFile: "required",
      example: "dev_secret_change_me_at_least_32chars",
      onError:
        "Under 32 characters stops the start. The development default applies outside production alone, so a production start with no value stops.",
      productionRequired: true,
      secret: true,
      section: "core",
    }),
  BETTER_AUTH_URL: devDefault(z.url(), `http://localhost:${declaredPort}`)
    .describe(
      "The public origin of the API server. It builds the sign-in callback URLs and decides the cookie `Secure` flag."
    )
    .meta({
      example: "https://api.example.com",
      onError:
        "A value that is not a URL stops the start. A wrong origin breaks every sign-in callback.",
      productionRequired: true,
      section: "origins",
    }),
  CORS_ORIGIN: devDefault(z.url(), "http://localhost:3001")
    .describe(
      "The public origin of the web app. It sets the CORS allow-list, the passkey relying party and the cookie same-site test."
    )
    .meta({
      example: "https://app.example.com",
      onError:
        "A wrong value makes the browser report a CORS failure, and it binds passkeys to the wrong relying party.",
      productionRequired: true,
      section: "origins",
    }),
  DATABASE_URL: devDefault(
    z.string().min(1),
    "postgresql://postgres:password@localhost:5432/freenary"
  )
    .describe(
      "The PostgreSQL connection string the Prisma driver adapter opens."
    )
    .meta({
      example: "postgresql://postgres:password@localhost:5432/freenary",
      onError:
        "An empty value stops the start. An unreachable host fails at the first query, not at boot, because the driver connects late. In the Docker stack Compose builds this value from `POSTGRES_PASSWORD`.",
      productionRequired: true,
      secret: true,
      section: "database",
    }),
  DICTIONARY_PUBLIC_KEY: z
    .string()
    .optional()
    .describe(
      "An Ed25519 public key in PEM form. A value turns signature checks of the merchant dictionary on."
    )
    .meta({
      example:
        "-----BEGIN PUBLIC KEY-----\\nMCow...\\n-----END PUBLIC KEY-----",
      onError:
        "Unset loads the dictionary with no check. A set key with no signature file makes the loader refuse the dictionary, and it warns `Dictionary signature missing:`.",
      section: "categorisation",
    }),
  EMAIL_FROM: z
    .string()
    .optional()
    .describe(
      "The envelope sender, for example `Freenary <no-reply@example.com>`."
    )
    .meta({
      example: "Freenary <no-reply@example.com>",
      onError: "Both `resend` and `smtp` stop the start without it.",
      section: "email",
    }),
  EMAIL_PROVIDER: z
    .enum(["resend", "smtp"])
    .optional()
    .describe(
      "Picks the email adapter. Unset means no email provider is connected."
    )
    .meta({
      example: "smtp",
      onError:
        "Unset means no email at all: Freenary sends no one-time code and asks for no address confirmation.",
      section: "email",
    }),
  ENABLE_BANKING_APP_ID: z
    .string()
    .optional()
    .describe("The Enable Banking application identifier.")
    .meta({
      example: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      onError: "Enable Banking needs both of its values.",
      section: "bank",
    }),
  ENABLE_BANKING_PRIVATE_KEY: z
    .string()
    .optional()
    .describe("The Enable Banking PEM private key.")
    .meta({
      example:
        "-----BEGIN PRIVATE KEY-----\\nMIIEvQ...\\n-----END PRIVATE KEY-----",
      onError: "Enable Banking needs both of its values.",
      secret: true,
      section: "bank",
    }),
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .describe("With `GOOGLE_CLIENT_SECRET`, it adds the Google button.")
    .meta({
      example: "000000000000-xxxxxxxx.apps.googleusercontent.com",
      onError: "Alone it adds nothing.",
      section: "sign-in",
    }),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("With `GOOGLE_CLIENT_ID`, it adds the Google button.")
    .meta({
      example: "GOCSPX-xxxxxxxxxxxxxxxx",
      onError: "Alone it adds nothing.",
      secret: true,
      section: "sign-in",
    }),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Picks the runtime mode: `development`, `production` or `test`.")
    .meta({
      envFile: "none",
      example: "production",
      onError:
        "`production` drops the log file drain and turns the cookie warning into a refusal. `test` turns the sign-in rate limits off. Compose always sets `production`.",
      section: "core",
    }),
  OIDC_CLIENT_ID: z
    .string()
    .optional()
    .describe("With `OIDC_DISCOVERY_URL`, it adds the single sign-on button.")
    .meta({
      example: "freenary",
      onError: "Alone it adds nothing.",
      section: "sign-in",
    }),
  OIDC_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("The client secret.")
    .meta({
      example: "xxxxxxxxxxxxxxxxxxxxxxxx",
      onError: "Unset means a public client.",
      secret: true,
      section: "sign-in",
    }),
  OIDC_DISCOVERY_URL: z
    .url()
    .optional()
    .describe(
      "With `OIDC_CLIENT_ID`, it adds the single sign-on button. Point it at the `.well-known/openid-configuration` document."
    )
    .meta({
      example: "https://idp.example.com/.well-known/openid-configuration",
      onError: "A value that is not a URL stops the start.",
      section: "sign-in",
    }),
  OIDC_PROVIDER_NAME: z.string().optional().describe("The button label.").meta({
    example: "Example SSO",
    onError: "Unset shows a translated `single sign-on` label.",
    section: "sign-in",
  }),
  OIDC_SCOPES: z
    .string()
    .optional()
    .describe(
      "Comma-separated extra scopes. Freenary always asks for `openid`, `email` and `profile`."
    )
    .meta({
      example: "groups",
      onError: "Unset asks for those three alone.",
      section: "sign-in",
    }),
  PORT: z
    .string()
    .regex(/^\d+$/u, "PORT must be a decimal number between 1 and 65535")
    .transform(Number)
    .pipe(z.number().int().positive().max(65_535))
    .default(DEFAULT_PORT)
    .describe(
      "The port the API server listens on. It also fills the `BETTER_AUTH_URL` default."
    )
    .meta({
      envFile: "none",
      example: "3000",
      onError:
        "A non-digit character stops the start. In the Docker stack it must stay `3000`, because the healthcheck fetches port 3000 inside the container. Never put it in the root `.env` file, which the `server` service loads whole.",
      section: "core",
    }),
  POWENS_CLIENT_ID: z
    .string()
    .optional()
    .describe("The Powens client identifier.")
    .meta({
      example: "12345678",
      onError: "Powens needs all three of its values.",
      section: "bank",
    }),
  POWENS_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("The Powens client secret.")
    .meta({
      example: "xxxxxxxxxxxxxxxxxxxxxxxx",
      onError: "Powens needs all three of its values.",
      secret: true,
      section: "bank",
    }),
  POWENS_DOMAIN: z
    .string()
    .optional()
    .describe(
      "The Powens domain, for example `acme-sandbox`. A value that ends with `.biapi.pro` also works."
    )
    .meta({
      example: "acme-sandbox",
      onError: "Powens needs all three of its values.",
      section: "bank",
    }),
  RESEND_API_KEY: z.string().optional().describe("The Resend API key.").meta({
    example: "re_xxxxxxxxxxxxxxxxxxxxxxxx",
    onError: "`resend` stops the start without it.",
    secret: true,
    section: "email",
  }),
  SMTP_HOST: z.string().optional().describe("The mail host.").meta({
    example: "smtp.example.com",
    onError: "`smtp` stops the start without it.",
    section: "email",
  }),
  SMTP_PASSWORD: z.string().optional().describe("The SMTP password.").meta({
    example: "a-mail-account-password",
    onError: "The adapter reads it only when `SMTP_USER` holds a value.",
    secret: true,
    section: "email",
  }),
  SMTP_PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65_535)
    .optional()
    .describe("The mail port.")
    .meta({
      default: "`465` with `SMTP_SECURE=true`, else `587`",
      example: "587",
      onError: "A value above 65535 stops the start.",
      section: "email",
    }),
  SMTP_SECURE: z
    .stringbool()
    .default(false)
    .describe("`true` picks implicit TLS. `false` picks STARTTLS.")
    .meta({
      example: "false",
      onError: "A value that is not a boolean string stops the start.",
      section: "email",
    }),
  SMTP_USER: z.string().optional().describe("The SMTP user.").meta({
    example: "no-reply@example.com",
    onError: "Unset means Freenary sends no SMTP credentials at all.",
    section: "email",
  }),
  TRANSACTION_CLASSIFIER: z
    .enum(["jev"])
    .optional()
    .describe(
      "Names the classifier that categorises a merchant no rule, no dictionary entry and no correction knows. The one value is `jev`, which asks TypeSafe."
    )
    .meta({
      example: "jev",
      onError:
        "Unset calls no model, and such a transaction stays uncategorised. Any other value stops the start.",
      section: "categorisation",
    }),
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
      "The addresses or CIDR ranges of the proxies in front of the API server. Rate limits key on the caller address behind them."
    )
    .meta({
      example: "10.0.0.0/24,192.0.2.10",
      onError:
        "A malformed entry stops the start. Unset behind a multi-hop proxy makes every caller share one rate-limit bucket.",
      section: "origins",
    }),
  TYPESAFE_API_KEY: z
    .string()
    .optional()
    .describe("The TypeSafe API key.")
    .meta({
      example: "ts-...",
      onError:
        "With `TRANSACTION_CLASSIFIER=jev` and no key the start stops with `TRANSACTION_CLASSIFIER=jev requires TYPESAFE_API_KEY to be set.`",
      secret: true,
      section: "categorisation",
    }),
  TYPESAFE_MODEL: z
    .string()
    .default("jev-latest")
    .describe(
      "The TypeSafe model id or alias. It is part of the cache key, so a change asks every merchant again."
    )
    .meta({
      example: "jev-latest",
      onError:
        "The default follows the newest model. Pin a version to freeze the answers.",
      section: "categorisation",
    }),
} as const;

declare module "zod/v4/core" {
  interface GlobalMeta {
    default?: string;
    envFile?: "required" | "commented" | "none";
    example?: string;
    onError?: string;
    productionRequired?: boolean;
    secret?: boolean;
    section?: string;
  }
}

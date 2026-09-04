# `packages/email` — Email Delivery

The transport boundary for outbound mail. One interface, one adapter per transport, one choice resolved at startup. Callers ask for a message to be sent; nothing above this package names a mail service. Today every message is an authentication code — confirming an address after sign-up, or resetting a forgotten password. Nobody signs in with one: that is [ADR-005](../../docs/adr/005-sign-in-methods-and-account-linking.md)'s decision, not this package's business.

## Stack

- **`fetch`** for Resend's REST API — no vendor SDK.
- **nodemailer** for SMTP.
- **`@freenary/env`** for the configuration the registry reads.

## Layout

```
src/
  index.ts            # sendEmail(), isEmailEnabled
  registry.ts         # createEmailProvider(settings) + the env-resolved singleton
  types.ts            # EmailProvider, EmailMessage
  providers/
    log.ts            # development only: prints the message, delivers nothing
    resend.ts         # POST https://api.resend.com/emails
    smtp.ts           # pooled nodemailer transport
```

## Conventions

- **`EmailProvider` is the boundary**: a `readonly id` and `send(message)`. The `id` names the adapter rather than being read at runtime — nothing above the boundary branches on which transport is in use, and it is what the registry's tests assert selection by. It mirrors the banking connector boundary in `packages/api/src/providers` — providers are interchangeable connectors, never the core of the application. `EmailMessage` is `to`, `subject` and plain-text `text`; every message this app sends is a short transactional notice, so there is no HTML path to keep in sync.
- **The registry resolves one adapter from `EMAIL_PROVIDER`**, and `emailProvider` is built once at module import. `createEmailProvider` takes an explicit `EmailSettings` object rather than reading `env` itself, so the resolution rules are testable without mutating the environment.
- **An adapter is built once and keeps its connections.** `smtp` passes `pool: true`, because nodemailer pools nothing by default and would otherwise open a fresh TCP and TLS handshake per message; `resend` needs nothing, since `fetch` reuses the agent's connections. A new adapter that holds a connection reuses one client for the process rather than one per `send`.
- **It fails fast, not at delivery.** A provider named but half-configured (`resend` without `RESEND_API_KEY`, `smtp` without `SMTP_HOST`, either without `EMAIL_FROM`) throws at import with the missing variable in the message. Never soften that into a warning or a no-op fallback: a swallowed one-time code is discovered by the user, not the operator.
- **`log` is refused when `NODE_ENV=production`.** It prints codes to the server log, which is indistinguishable from a working transport until someone reads the log. It is what makes the dev stack's code flows work with no mail account.
- **No provider configured is a supported state**: `emailProvider` is `null` and `isEmailEnabled` is `false`. Callers hide what needs mail rather than offering and failing it — `packages/auth` skips the `emailOTP` plugin and drops `requireEmailVerification`, so an instance with no transport has no address confirmation and no password reset. `sendEmail` still throws if something calls it anyway.
- Adding a transport is one file in `providers/`, one `EMAIL_PROVIDER` enum member in `packages/env/src/server.ts`, and one `switch` arm here. Adapters take their credentials as constructor arguments and never read `env`.
- **Message copy is not here.** Subjects and bodies live with the feature that sends them — `packages/auth/src/emails.ts` for authentication codes. That copy is English only: Paraglide's catalogs live in `apps/web`, and the locale a user picked in the browser is not carried on an auth request.

/**
 * Security thresholds for authentication, in one place so the API, the server
 * and the interface cannot drift from each other.
 */

/**
 * Above the 8-character floor Better Auth defaults to. Length is the only
 * property a rule can enforce that reliably raises guessing cost; composition
 * rules do not, which is why there is no character-class requirement.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Better Auth defaults to the same 128, but a bound the interface quotes back
 * to the user has to be owned here rather than inherited.
 */
export const MAX_PASSWORD_LENGTH = 128;

/** Codes are short-lived: a mailbox that leaks later must not still open the account. */
export const OTP_EXPIRY_SECONDS = 600;

export const OTP_LENGTH = 6;

/**
 * Session lifetime, and the freshness window that matches it.
 *
 * Better Auth gates `/list-sessions` on `session.freshAge`, whose 24-hour
 * default is far shorter than the seven-day session it guards — and a session's
 * `createdAt` never moves, so the active-sessions screen would fail for six
 * days out of seven. The narrower re-authentication window that linking and
 * unlinking need is enforced by `enforceAuthPolicy` instead, so `freshAge` is
 * free to cover the whole lifetime.
 */
export const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/** Wrong codes accepted per issued OTP before it is burned. */
export const OTP_ALLOWED_ATTEMPTS = 3;

/**
 * How long "remember this device" holds. Published through `authCapabilities`
 * and rendered as a message parameter, so the checkbox cannot end up naming a
 * number the server no longer enforces.
 */
export const TRUSTED_DEVICE_DAYS = 30;

export const TRUSTED_DEVICE_SECONDS = TRUSTED_DEVICE_DAYS * 24 * 60 * 60;

/**
 * Endpoints refused outright. The `emailOTP` plugin is registered for address
 * confirmation and password reset, and registering it also exposes a
 * passwordless sign-in route — which this deployment does not offer, because
 * every account authenticates with a password first.
 */
export const DISABLED_PATHS = {
  "/sign-in/email-otp": true,
} satisfies Record<string, true>;

/** The route that issues a one-time code, guarded by type below. */
export const OTP_ISSUING_PATH = "/email-otp/send-verification-otp";

/**
 * Code purposes this deployment will not issue. Refusing only the sign-in
 * *route* would leave the issuing route mailing "your sign-in code" to any
 * address named, for a code nothing accepts — an unauthenticated mailer and a
 * ready-made phishing lure.
 */
export const DISABLED_OTP_TYPES = {
  "sign-in": true,
} satisfies Record<string, true>;

/**
 * How recently the user must have authenticated to change which identities can
 * open the account. Better Auth enforces `session.freshAge` on unlink already;
 * this narrower window covers linking too, and is what "re-authenticate first"
 * means for both.
 */
export const REAUTH_WINDOW_SECONDS = 900;

/**
 * Endpoints that change which credentials open the account.
 *
 * Registering a passkey belongs here for the same reason linking does: a
 * passkey is a primary way in, needing neither the password nor the second
 * factor. Better Auth's passkey plugin gates both halves of registration on
 * `session.freshAge`, which this deployment raises to the session lifetime, so
 * without these entries a week-old borrowed session could enrol a credential.
 */
export const REAUTH_PATHS = {
  "/link-social": true,
  // Deleting is here for the same reason `/unlink-account` is: stripping the
  // account's only phishing-resistant credential changes how it opens.
  // Renaming does not, so `/passkey/update-passkey` is deliberately absent.
  "/passkey/delete-passkey": true,
  "/passkey/generate-register-options": true,
  "/passkey/verify-registration": true,
  "/unlink-account": true,
} satisfies Record<string, true>;

/**
 * Per-caller limits for the endpoints this product actually calls.
 *
 * These are not additions: Better Auth resolves built-in rules, then plugin
 * rules, then these, each overwriting the last outright — so an entry here
 * replaces whatever came before it, looser or stricter. Its built-in rule caps
 * anything under `/sign-in` or `/sign-up` at 3 per 10 seconds, which is too
 * tight for a form a household shares an address behind, so the paths below are
 * restated deliberately. `/email-otp/*` is left to the plugin's own 3 per 60
 * seconds, which is already the limit we would choose.
 */
export const RATE_LIMIT_RULES = {
  "/passkey/generate-authenticate-options": { max: 20, window: 60 },
  "/passkey/verify-authentication": { max: 20, window: 60 },
  "/sign-in/email": { max: 10, window: 60 },
  "/sign-in/social": { max: 10, window: 60 },
  "/sign-up/email": { max: 5, window: 300 },
  "/two-factor/verify-backup-code": { max: 5, window: 300 },
  "/two-factor/verify-totp": { max: 10, window: 300 },
} satisfies Record<string, { max: number; window: number }>;

export const RATE_LIMIT_DEFAULT = { max: 100, window: 60 };

/**
 * The progressive sign-in form asks whether an address has an account so it can
 * reveal the right fields, which makes that answer readable to anyone who can
 * call it. It cannot be hidden while the form works this way, so it is capped
 * hard enough that enumerating a list costs more than it is worth.
 */
export const ACCOUNT_EXISTS_RATE_LIMIT = { max: 20, window: 60 };

/**
 * The assistant spends money at a model provider on every question, so the
 * limit is keyed on the user rather than the caller address: a household behind
 * one NAT would otherwise share a budget.
 */
export const AI_CHAT_RATE_LIMIT = { max: 30, window: 300 };

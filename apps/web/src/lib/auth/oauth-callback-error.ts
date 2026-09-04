import { m } from "@/paraglide/messages.js";

/**
 * Better Auth reports a failure that happens *after* the redirect leg by
 * sending the browser back to `errorCallbackURL` with `?error=<code>`, not by
 * refusing the request that started it. Nothing else surfaces these, so a
 * screen that does not read the parameter shows a silent bounce.
 *
 * The parameter carries three kinds of value: Better Auth's own
 * `OAUTH_CALLBACK_ERROR_CODES`, its free-form linking failures with spaces
 * turned into underscores, and whatever OAuth error the provider itself sent.
 *
 * Message thunks, never resolved strings: a module is evaluated once per server
 * process, so a called message would pin the first request's locale.
 */
const MESSAGE_BY_CODE = {
  account_already_linked_to_different_user: m.auth_error_oauth_linked_elsewhere,
  // Better Auth's free-form "account not linked": a row already exists for the
  // provider's address but is not confirmed, so it will not be linked into.
  account_not_linked: m.auth_error_oauth_email_unverified,
  email_does_not_match: m.auth_error_oauth_email_mismatch,
  email_not_found: m.auth_error_oauth_no_email,
  email_not_verified: m.auth_error_oauth_email_unverified,
  unable_to_link_account: m.auth_error_oauth_link_refused,
} satisfies Record<string, () => string>;

/**
 * The reader's own refusal on the provider's consent screen, forwarded verbatim
 * by the provider. Not a failure: cleared from the address bar without a word,
 * the same way an aborted passkey ceremony is.
 */
const CANCELLED_CODES = {
  access_denied: true,
  user_cancelled_authorize: true,
} satisfies Record<string, true>;

const isKnownCode = (code: string): code is keyof typeof MESSAGE_BY_CODE =>
  Object.hasOwn(MESSAGE_BY_CODE, code);

export const isCancelledOauthCallback = (code: string): boolean =>
  Object.hasOwn(CANCELLED_CODES, code);

/**
 * The remaining codes are provider or protocol faults the reader can do nothing
 * about — a missing code, a mismatched issuer, an unreadable profile — so they
 * share one message rather than each getting wording nobody can act on.
 */
export const oauthCallbackErrorMessage = (code: string): string =>
  isKnownCode(code) ? MESSAGE_BY_CODE[code]() : m.auth_error_oauth_generic();

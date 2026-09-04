import { m } from "@/paraglide/messages.js";

/**
 * Message thunks, never resolved strings: this module is evaluated once per
 * server process, so a called message would pin the first request's locale.
 */

/** Codes the password-guarded two-factor endpoints answer with. */
const TWO_FACTOR_MESSAGES = {
  CREDENTIAL_ACCOUNT_NOT_FOUND: m.settings_2fa_error_no_password,
  INVALID_BACKUP_CODE: m.settings_2fa_error_invalid_code,
  INVALID_CODE: m.settings_2fa_error_invalid_code,
  INVALID_PASSWORD: m.settings_2fa_error_wrong_password,
} satisfies Record<string, () => string>;

/**
 * Codes `/link-social` and `/unlink-account` answer with. Both refuse a session
 * older than 15 minutes, and that refusal has to name the remedy rather than
 * read as a generic failure.
 */
const LINKED_ACCOUNT_MESSAGES = {
  FAILED_TO_UNLINK_LAST_ACCOUNT: m.settings_accounts_error_last_account,
  SESSION_NOT_FRESH: m.settings_accounts_error_session_not_fresh,
} satisfies Record<string, () => string>;

/**
 * Codes the passkey endpoints and the browser's own WebAuthn ceremony answer
 * with. A dismissed prompt is not in here: the caller drops it before asking
 * for a message, because the user already knows they cancelled.
 */
const PASSKEY_MESSAGES = {
  CHALLENGE_NOT_FOUND: m.settings_passkeys_error_challenge,
  ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED:
    m.settings_passkeys_error_already_registered,
  FAILED_TO_UPDATE_PASSKEY: m.settings_passkeys_error_rename_failed,
  FAILED_TO_VERIFY_REGISTRATION: m.settings_passkeys_error_verification,
  PASSKEY_NOT_FOUND: m.settings_passkeys_error_not_found,
  PREVIOUSLY_REGISTERED: m.settings_passkeys_error_already_registered,
  // Registering a passkey adds a way into the account, so it sits behind the
  // same re-authentication window as connecting or disconnecting a provider.
  SESSION_NOT_FRESH: m.settings_accounts_error_session_not_fresh,
} satisfies Record<string, () => string>;

const isTwoFactorCode = (
  code: string
): code is keyof typeof TWO_FACTOR_MESSAGES =>
  Object.hasOwn(TWO_FACTOR_MESSAGES, code);

const isLinkedAccountCode = (
  code: string
): code is keyof typeof LINKED_ACCOUNT_MESSAGES =>
  Object.hasOwn(LINKED_ACCOUNT_MESSAGES, code);

const isPasskeyCode = (code: string): code is keyof typeof PASSKEY_MESSAGES =>
  Object.hasOwn(PASSKEY_MESSAGES, code);

const TOO_MANY_REQUESTS = 429;

/** The part of a refused better-auth call these screens read. */
export interface SecurityRequestError {
  code?: string;
  status?: number;
}

// A rate-limited refusal carries a status and no code at all, so branching on
// the code alone lands on "something went wrong" — the one piece of advice that
// cannot work, since only waiting clears the window.
const isRateLimited = (error: SecurityRequestError): boolean =>
  error.status === TOO_MANY_REQUESTS;

export const twoFactorErrorMessage = (error: SecurityRequestError): string => {
  if (isRateLimited(error)) {
    return m.auth_error_rate_limited();
  }
  const code = error.code ?? "";
  return isTwoFactorCode(code)
    ? TWO_FACTOR_MESSAGES[code]()
    : m.settings_2fa_error_generic();
};

export const linkedAccountErrorMessage = (
  error: SecurityRequestError
): string => {
  if (isRateLimited(error)) {
    return m.auth_error_rate_limited();
  }
  const code = error.code ?? "";
  return isLinkedAccountCode(code)
    ? LINKED_ACCOUNT_MESSAGES[code]()
    : m.settings_accounts_error_generic();
};

export const passkeyErrorMessage = (error: SecurityRequestError): string => {
  if (isRateLimited(error)) {
    return m.auth_error_rate_limited();
  }
  const code = error.code ?? "";
  return isPasskeyCode(code)
    ? PASSKEY_MESSAGES[code]()
    : m.settings_passkeys_error_generic();
};

import { m } from "@/paraglide/messages.js";

/** The part of a refused better-auth call this screen reads. */
export interface AuthRequestError {
  code?: string;
  status: number;
}

/**
 * The password floor and ceiling the server enforces and publishes through
 * `auth.capabilities`. Undefined until that answers, and a figure this screen
 * made up instead would be a bound the server never promised.
 */
export interface PasswordBounds {
  maxPasswordLength: number;
  minPasswordLength: number;
}

const TOO_MANY_REQUESTS = 429;

// Holds the message functions rather than their results: a module is evaluated
// once per server process, so a called message would pin the first request's
// locale for everyone after it.
const MESSAGE_BY_CODE = {
  EMAIL_NOT_VERIFIED: m.auth_error_email_not_verified,
  INVALID_BACKUP_CODE: m.auth_error_invalid_backup_code,
  INVALID_CODE: m.auth_error_invalid_otp,
  INVALID_EMAIL_OR_PASSWORD: m.auth_error_invalid_credentials,
  INVALID_OTP: m.auth_error_invalid_otp,
  INVALID_TWO_FACTOR_COOKIE: m.auth_error_two_factor_expired,
  OTP_EXPIRED: m.auth_error_otp_expired,
  PASSWORD_COMPROMISED: m.auth_error_password_compromised,
  TOO_MANY_ATTEMPTS: m.auth_error_too_many_attempts,
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: m.auth_error_two_factor_expired,
} satisfies Record<string, () => string>;

const isKnownCode = (code: string): code is keyof typeof MESSAGE_BY_CODE =>
  Object.hasOwn(MESSAGE_BY_CODE, code);

/**
 * The server's own wording is untranslated and, on a sign-in screen, can say
 * more about an account than an unauthenticated caller may learn — so it is
 * never rendered.
 */
export const authErrorMessage = (
  error: AuthRequestError,
  bounds: PasswordBounds | undefined
): string => {
  if (error.status === TOO_MANY_REQUESTS) {
    return m.auth_error_rate_limited();
  }

  const code = error.code ?? "";

  // A length refusal quotes the server's own bound, or names none. The number
  // is read out and checked, never assumed present: a deployment older than
  // the field answers without it, and "128" spelled here or `undefined`
  // rendered into the sentence are both worse than naming no figure.
  if (code === "PASSWORD_TOO_SHORT") {
    const count = bounds?.minPasswordLength;
    return count === undefined
      ? m.auth_error_password_too_short_no_bound()
      : m.auth_error_password_too_short({ count });
  }
  if (code === "PASSWORD_TOO_LONG") {
    const count = bounds?.maxPasswordLength;
    return count === undefined
      ? m.auth_error_password_too_long_no_bound()
      : m.auth_error_password_too_long({ count });
  }

  return isKnownCode(code) ? MESSAGE_BY_CODE[code]() : m.auth_error_generic();
};

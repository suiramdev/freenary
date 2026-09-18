import { m } from "@/paraglide/messages.js";

const MESSAGE_BY_CODE = {
  account_already_linked_to_different_user: m.auth_error_oauth_linked_elsewhere,
  account_not_linked: m.auth_error_oauth_email_unverified,
  email_does_not_match: m.auth_error_oauth_email_mismatch,
  email_not_found: m.auth_error_oauth_no_email,
  email_not_verified: m.auth_error_oauth_email_unverified,
  unable_to_link_account: m.auth_error_oauth_link_refused,
} satisfies Record<string, () => string>;

const READER_CANCELLED_CODES = {
  access_denied: true,
  user_cancelled_authorize: true,
} satisfies Record<string, true>;

const isKnownCode = (code: string): code is keyof typeof MESSAGE_BY_CODE =>
  Object.hasOwn(MESSAGE_BY_CODE, code);

export const isCancelledOauthCallback = (code: string): boolean =>
  Object.hasOwn(READER_CANCELLED_CODES, code);

export const oauthCallbackErrorMessage = (code: string): string =>
  isKnownCode(code) ? MESSAGE_BY_CODE[code]() : m.auth_error_oauth_generic();

import { z } from "zod";

import { m } from "@/paraglide/messages.js";

/** Digits in a TOTP code, fixed by authenticator convention. Deliberately not
 * the server's emailed-code length: the two are independent facts, so a change
 * to one must not move the other. */
export const TOTP_CODE_LENGTH = 6;

/** Derived, so the pattern cannot claim a length the constant does not. */
export const TOTP_CODE_PATTERN = new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`, "u");

// Built per call rather than once per module: a module-level schema would
// freeze its messages in whichever locale rendered first, and on the server
// that locale belongs to one request while the schema is shared by all of them.
// Switching locale reloads the document, so a mount is a fresh locale.
export const emailField = () => z.email(m.auth_error_invalid_email());

/**
 * The emailed code's length is the server's, published on `auth.capabilities`,
 * so the message never promises a different one. Without it only presence is
 * checked: a length of this screen's own invention would reject a code the
 * server would have accepted.
 */
export const otpField = (length: number | undefined) =>
  length === undefined
    ? z.string().min(1, m.auth_error_code_required())
    : z.string().length(length, m.auth_error_code_length({ count: length }));

/**
 * A length floor applies only where a password is being chosen, and it is the
 * server's own so the message never promises a different one. Without a floor
 * only presence is checked: rejecting an existing password that predates
 * today's minimum would lock its owner out of their account.
 */
export const passwordField = (minLength: number | undefined) =>
  minLength === undefined
    ? z.string().min(1, m.auth_error_password_required())
    : z
        .string()
        .min(minLength, m.auth_error_password_min_length({ count: minLength }));

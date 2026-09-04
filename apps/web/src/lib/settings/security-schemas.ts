import { z } from "zod";

import { TOTP_CODE_LENGTH, TOTP_CODE_PATTERN } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

// Message thunks, resolved at parse time: evaluating them here would pin the
// locale of whichever request loaded this module first.

/** Confirming an existing password — length is the server's business, not ours. */
export const securityPasswordSchema = z.object({
  password: z
    .string()
    .min(1, { error: () => m.settings_2fa_error_password_required() }),
});

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(TOTP_CODE_PATTERN, {
      error: () =>
        m.settings_2fa_error_code_format({ count: TOTP_CODE_LENGTH }),
    }),
});

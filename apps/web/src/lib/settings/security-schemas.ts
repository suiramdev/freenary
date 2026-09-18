import { z } from "zod";

import { TOTP_CODE_LENGTH, TOTP_CODE_PATTERN } from "@/lib/auth/auth-schemas";
import { m } from "@/paraglide/messages.js";

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

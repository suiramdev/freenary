import { z } from "zod";

import { m } from "@/paraglide/messages.js";

export const TOTP_CODE_LENGTH = 6;

export const TOTP_CODE_PATTERN = new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`, "u");

export const emailField = () => z.email(m.auth_error_invalid_email());

export const otpField = (serverCodeLength: number | undefined) =>
  serverCodeLength === undefined
    ? z.string().min(1, m.auth_error_code_required())
    : z
        .string()
        .length(
          serverCodeLength,
          m.auth_error_code_length({ count: serverCodeLength })
        );

export const passwordField = (serverMinLength: number | undefined) =>
  serverMinLength === undefined
    ? z.string().min(1, m.auth_error_password_required())
    : z
        .string()
        .min(
          serverMinLength,
          m.auth_error_password_min_length({ count: serverMinLength })
        );

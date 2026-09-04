import { env } from "@freenary/env/server";

import { createLogEmailProvider } from "./providers/log";
import { createResendEmailProvider } from "./providers/resend";
import { createSmtpEmailProvider } from "./providers/smtp";
import type { EmailProvider } from "./types";

export interface EmailSettings {
  provider: "log" | "resend" | "smtp" | undefined;
  from: string | undefined;
  isProduction: boolean;
  resendApiKey: string | undefined;
  smtpHost: string | undefined;
  smtpPassword: string | undefined;
  smtpPort: number | undefined;
  smtpSecure: boolean;
  smtpUser: string | undefined;
}

const IMPLICIT_TLS_PORT = 465;
const STARTTLS_PORT = 587;

const requireVar = (
  provider: string,
  name: string,
  value: string | undefined
): string => {
  if (value === undefined) {
    throw new Error(`EMAIL_PROVIDER=${provider} requires ${name} to be set.`);
  }
  return value;
};

/**
 * Resolves the configured adapter. A provider named but left half-configured
 * throws here, at startup, rather than swallowing one-time codes at delivery
 * time — when the user is the one who finds out.
 */
export const createEmailProvider = (
  settings: EmailSettings
): EmailProvider | null => {
  switch (settings.provider) {
    case undefined: {
      return null;
    }
    case "log": {
      if (settings.isProduction) {
        throw new Error(
          "EMAIL_PROVIDER=log prints one-time codes to the server log and is refused in production. Configure `resend` or `smtp`."
        );
      }
      return createLogEmailProvider();
    }
    case "resend": {
      return createResendEmailProvider({
        apiKey: requireVar("resend", "RESEND_API_KEY", settings.resendApiKey),
        from: requireVar("resend", "EMAIL_FROM", settings.from),
      });
    }
    case "smtp": {
      return createSmtpEmailProvider({
        from: requireVar("smtp", "EMAIL_FROM", settings.from),
        host: requireVar("smtp", "SMTP_HOST", settings.smtpHost),
        password: settings.smtpPassword,
        port:
          settings.smtpPort ??
          (settings.smtpSecure ? IMPLICIT_TLS_PORT : STARTTLS_PORT),
        secure: settings.smtpSecure,
        user: settings.smtpUser,
      });
    }
    default: {
      return null;
    }
  }
};

export const emailProvider = createEmailProvider({
  from: env.EMAIL_FROM,
  isProduction: env.NODE_ENV === "production",
  provider: env.EMAIL_PROVIDER,
  resendApiKey: env.RESEND_API_KEY,
  smtpHost: env.SMTP_HOST,
  smtpPassword: env.SMTP_PASSWORD,
  smtpPort: env.SMTP_PORT,
  smtpSecure: env.SMTP_SECURE,
  smtpUser: env.SMTP_USER,
});

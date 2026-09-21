import { env } from "@freenary/env/server";
import { Data, Match, Result } from "effect";

import { createResendEmailProvider } from "./providers/resend";
import { createSmtpEmailProvider } from "./providers/smtp";
import type { EmailProvider } from "./types";

export type EmailProviderName = "resend" | "smtp";

export interface EmailProviderUnavailableReason {
  readonly kind: "missing-variable";
  readonly variable: string;
}

export interface EmailSettings {
  provider: EmailProviderName | undefined;
  from: string | undefined;
  resendApiKey: string | undefined;
  smtpHost: string | undefined;
  smtpPassword: string | undefined;
  smtpPort: number | undefined;
  smtpSecure: boolean;
  smtpUser: string | undefined;
}

const IMPLICIT_TLS_PORT = 465;
const STARTTLS_PORT = 587;

export class EmailProviderUnavailable extends Data.TaggedError(
  "EmailProviderUnavailable"
)<{
  readonly provider: EmailProviderName;
  readonly reason: EmailProviderUnavailableReason;
  readonly message: string;
}> {}

const requireVar = (
  provider: EmailProviderName,
  variable: string,
  value: string | undefined
): Result.Result<string, EmailProviderUnavailable> =>
  Result.fromNullishOr(
    value,
    () =>
      new EmailProviderUnavailable({
        message: `EMAIL_PROVIDER=${provider} requires ${variable} to be set.`,
        provider,
        reason: { kind: "missing-variable", variable },
      })
  );

export const createEmailProvider = (
  settings: EmailSettings
): Result.Result<EmailProvider | null, EmailProviderUnavailable> => {
  if (settings.provider === undefined) {
    return Result.succeed(null);
  }

  return Match.value(settings.provider).pipe(
    Match.when("resend", () =>
      Result.map(
        Result.all({
          apiKey: requireVar("resend", "RESEND_API_KEY", settings.resendApiKey),
          from: requireVar("resend", "EMAIL_FROM", settings.from),
        }),
        createResendEmailProvider
      )
    ),
    Match.when("smtp", () =>
      Result.map(
        Result.all({
          from: requireVar("smtp", "EMAIL_FROM", settings.from),
          host: requireVar("smtp", "SMTP_HOST", settings.smtpHost),
        }),
        ({ from, host }) =>
          createSmtpEmailProvider({
            from,
            host,
            password: settings.smtpPassword,
            port:
              settings.smtpPort ??
              (settings.smtpSecure ? IMPLICIT_TLS_PORT : STARTTLS_PORT),
            secure: settings.smtpSecure,
            user: settings.smtpUser,
          })
      )
    ),
    Match.exhaustive
  );
};

export const emailProvider = Result.getOrThrow(
  createEmailProvider({
    from: env.EMAIL_FROM,
    provider: env.EMAIL_PROVIDER,
    resendApiKey: env.RESEND_API_KEY,
    smtpHost: env.SMTP_HOST,
    smtpPassword: env.SMTP_PASSWORD,
    smtpPort: env.SMTP_PORT,
    smtpSecure: env.SMTP_SECURE,
    smtpUser: env.SMTP_USER,
  })
);

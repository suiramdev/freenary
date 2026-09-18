import { describe, expect, test } from "bun:test";

import { Option, Result } from "effect";

import type { EmailProviderUnavailable, EmailSettings } from "./registry";
import { createEmailProvider } from "./registry";
import type { EmailProvider } from "./types";

const settings = (overrides: Partial<EmailSettings>): EmailSettings => ({
  from: undefined,
  isProduction: false,
  provider: undefined,
  resendApiKey: undefined,
  smtpHost: undefined,
  smtpPassword: undefined,
  smtpPort: undefined,
  smtpSecure: false,
  smtpUser: undefined,
  ...overrides,
});

const failure = (
  result: Result.Result<EmailProvider | null, EmailProviderUnavailable>
): EmailProviderUnavailable => Option.getOrThrow(Result.getFailure(result));

describe("createEmailProvider", () => {
  test("reports no provider when none is named", () => {
    expect(Result.getOrThrow(createEmailProvider(settings({})))).toBeNull();
  });

  test("refuses the log adapter in production", () => {
    const refused = createEmailProvider(
      settings({ isProduction: true, provider: "log" })
    );

    expect(failure(refused).reason).toEqual({ kind: "refused-in-production" });
    expect(() => Result.getOrThrow(refused)).toThrow(/refused in production/u);
  });

  test("allows the log adapter outside production", () => {
    expect(
      Result.getOrThrow(createEmailProvider(settings({ provider: "log" })))?.id
    ).toBe("log");
  });

  test("refuses a named provider whose credentials are missing", () => {
    const resend = createEmailProvider(
      settings({ from: "a@b.test", provider: "resend" })
    );

    expect(failure(resend).reason).toEqual({
      kind: "missing-variable",
      variable: "RESEND_API_KEY",
    });
    expect(() => Result.getOrThrow(resend)).toThrow(/RESEND_API_KEY/u);

    const smtp = createEmailProvider(
      settings({ provider: "smtp", smtpHost: "mail.test" })
    );

    expect(failure(smtp).reason).toEqual({
      kind: "missing-variable",
      variable: "EMAIL_FROM",
    });
  });

  test("builds the configured transports", () => {
    expect(
      Result.getOrThrow(
        createEmailProvider(
          settings({
            from: "a@b.test",
            provider: "resend",
            resendApiKey: "re_test",
          })
        )
      )?.id
    ).toBe("resend");
    expect(
      Result.getOrThrow(
        createEmailProvider(
          settings({
            from: "a@b.test",
            provider: "smtp",
            smtpHost: "mail.test",
          })
        )
      )?.id
    ).toBe("smtp");
  });
});

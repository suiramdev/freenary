import { describe, expect, test } from "bun:test";

import type { EmailSettings } from "./registry";
import { createEmailProvider } from "./registry";

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

describe("createEmailProvider", () => {
  test("reports no provider when none is named", () => {
    expect(createEmailProvider(settings({}))).toBeNull();
  });

  test("refuses the log adapter in production", () => {
    expect(() =>
      createEmailProvider(settings({ isProduction: true, provider: "log" }))
    ).toThrow(/refused in production/u);
  });

  test("allows the log adapter outside production", () => {
    expect(createEmailProvider(settings({ provider: "log" }))?.id).toBe("log");
  });

  test("refuses a named provider whose credentials are missing", () => {
    expect(() =>
      createEmailProvider(settings({ from: "a@b.test", provider: "resend" }))
    ).toThrow(/RESEND_API_KEY/u);
    expect(() =>
      createEmailProvider(settings({ provider: "smtp", smtpHost: "mail.test" }))
    ).toThrow(/EMAIL_FROM/u);
  });

  test("builds the configured transports", () => {
    expect(
      createEmailProvider(
        settings({
          from: "a@b.test",
          provider: "resend",
          resendApiKey: "re_test",
        })
      )?.id
    ).toBe("resend");
    expect(
      createEmailProvider(
        settings({ from: "a@b.test", provider: "smtp", smtpHost: "mail.test" })
      )?.id
    ).toBe("smtp");
  });
});

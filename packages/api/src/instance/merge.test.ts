import { describe, expect, test } from "bun:test";

import type { Integration } from "@freenary/instance-config/integrations";
import {
  findIntegration,
  findVariant,
} from "@freenary/instance-config/integrations";
import { Option } from "effect";

import { candidateOf, writesOf } from "./merge";

const email: Integration = Option.getOrThrow(findIntegration("email"));
const banking: Integration = Option.getOrThrow(findIntegration("banking"));

const variantOf = (integration: Integration, id: string) =>
  Option.getOrThrow(findVariant(integration, id));

const smtp = variantOf(email, "smtp");
const resend = variantOf(email, "resend");
const emailOff = variantOf(email, "disabled");
const powens = variantOf(banking, "powens");

const SMTP_FORM = {
  EMAIL_FROM: "Freenary <no-reply@example.test>",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
};

describe("candidateOf", () => {
  test("writes the discriminant of the chosen variant", () => {
    const candidate = candidateOf(email, smtp, SMTP_FORM, {});

    expect(candidate.EMAIL_PROVIDER).toBe("smtp");
  });

  test("clears the discriminant for the disabled variant", () => {
    const candidate = candidateOf(
      email,
      emailOff,
      {},
      {
        EMAIL_FROM: "old@example.test",
        EMAIL_PROVIDER: "smtp",
      }
    );

    expect(candidate.EMAIL_PROVIDER).toBeUndefined();
  });

  test("keeps a stored secret when its field is left empty", () => {
    const candidate = candidateOf(
      email,
      smtp,
      { ...SMTP_FORM, SMTP_PASSWORD: "" },
      { SMTP_PASSWORD: "kept-secret" }
    );

    expect(candidate.SMTP_PASSWORD).toBe("kept-secret");
  });

  test("replaces a stored secret when its field is filled in", () => {
    const candidate = candidateOf(
      email,
      smtp,
      { ...SMTP_FORM, SMTP_PASSWORD: "new-secret" },
      { SMTP_PASSWORD: "kept-secret" }
    );

    expect(candidate.SMTP_PASSWORD).toBe("new-secret");
  });

  test("drops a non-secret field that is left empty", () => {
    const candidate = candidateOf(
      email,
      smtp,
      { ...SMTP_FORM, SMTP_USER: "" },
      { SMTP_USER: "old-user" }
    );

    expect(candidate.SMTP_USER).toBeUndefined();
  });

  test("drops the secrets of the variant the operator moved away from", () => {
    const candidate = candidateOf(
      email,
      resend,
      {
        EMAIL_FROM: "a@example.test",
        RESEND_API_KEY: "re_key",
      },
      { SMTP_HOST: "smtp.example.com", SMTP_PASSWORD: "kept-secret" }
    );

    expect(candidate.SMTP_PASSWORD).toBeUndefined();
  });

  test("leaves the settings of another integration alone", () => {
    const candidate = candidateOf(email, smtp, SMTP_FORM, {
      POWENS_CLIENT_SECRET: "powens-secret",
    });

    expect(candidate.POWENS_CLIENT_SECRET).toBe("powens-secret");
  });

  test("trims a value the operator pasted with spaces", () => {
    const candidate = candidateOf(
      banking,
      powens,
      {
        POWENS_CLIENT_ID: " 1234 ",
        POWENS_CLIENT_SECRET: "secret",
        POWENS_DOMAIN: "acme-sandbox",
      },
      {}
    );

    expect(candidate.POWENS_CLIENT_ID).toBe("1234");
  });
});

describe("writesOf", () => {
  test("deletes every key of the integration the candidate does not hold", () => {
    const writes = writesOf(email, { EMAIL_FROM: "a@example.test" });

    expect(writes.get("SMTP_PASSWORD")).toBeNull();
  });

  test("touches no key outside the integration", () => {
    const writes = writesOf(email, { POWENS_DOMAIN: "acme" });

    expect(writes.has("POWENS_DOMAIN")).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";

import { isSetupToken } from "./setup-token";

const TOKEN = "a-setup-token-of-some-length";

describe("setup token", () => {
  test("accepts the configured token", () => {
    expect(isSetupToken(TOKEN, TOKEN)).toBe(true);
  });

  test("accepts the token with the whitespace a paste carries", () => {
    expect(isSetupToken(TOKEN, ` ${TOKEN}\n`)).toBe(true);
  });

  test("refuses an empty answer", () => {
    expect(isSetupToken(TOKEN, "")).toBe(false);
  });

  test("refuses another value", () => {
    expect(isSetupToken(TOKEN, `${TOKEN}x`)).toBe(false);
  });
});

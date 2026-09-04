import { describe, expect, test } from "bun:test";

import { resolveCookiePolicy } from "./cookies";

describe("resolveCookiePolicy", () => {
  test("keeps the session cookie same-site when one hostname serves both", () => {
    expect(
      resolveCookiePolicy(
        "https://freenary.example.com",
        "https://freenary.example.com",
        true
      )
    ).toEqual({ httpOnly: true, sameSite: "lax", secure: true });
  });

  test("treats two ports on one hostname as same-site", () => {
    expect(
      resolveCookiePolicy(
        "http://localhost:3000",
        "http://localhost:3001",
        false
      )
    ).toEqual({ httpOnly: true, sameSite: "lax", secure: false });
  });

  test("keeps split subdomains same-site once their parent is declared", () => {
    // Registrable domains cannot be derived from a hostname without a
    // public-suffix list, so the operator naming the parent is the evidence.
    expect(
      resolveCookiePolicy(
        "https://api.example.com",
        "https://app.example.com",
        true,
        ".example.com"
      )
    ).toEqual({ httpOnly: true, sameSite: "lax", secure: true });
  });

  test("crosses sites for split hostnames with no declared parent", () => {
    expect(
      resolveCookiePolicy(
        "https://server.freenary.orb.local",
        "https://web.freenary.orb.local",
        false
      )
    ).toEqual({ httpOnly: true, sameSite: "none", secure: true });
  });

  test("refuses a cross-site cookie over plain HTTP in production", () => {
    expect(() =>
      resolveCookiePolicy(
        "http://api.example.com",
        "http://app.example.com",
        true
      )
    ).toThrow(/SameSite=None/u);
  });

  test("accepts plain HTTP in production once the parent is declared", () => {
    expect(
      resolveCookiePolicy(
        "http://api.example.com",
        "http://app.example.com",
        true,
        ".example.com"
      )
    ).toEqual({ httpOnly: true, sameSite: "lax", secure: false });
  });

  test("lets development run cross-host over HTTP after warning", () => {
    expect(
      resolveCookiePolicy(
        "http://api.example.com",
        "http://app.example.com",
        false
      )
    ).toEqual({ httpOnly: true, sameSite: "none", secure: false });
  });

  test("refuses a declared parent that does not cover both origins", () => {
    // A Domain the browser will not match makes it discard the cookie, so
    // sign-in answers 200 and nobody is ever signed in.
    expect(() =>
      resolveCookiePolicy(
        "https://api.acme-prod.com",
        "https://app.acme-prod.com",
        true,
        ".acme.com"
      )
    ).toThrow(/is not a parent of both/u);
    expect(() =>
      resolveCookiePolicy(
        "https://api.example.com",
        "https://app.example.com",
        true,
        "api.example.com"
      )
    ).toThrow(/is not a parent of both/u);
  });

  test("refuses a declared domain browsers will not scope a cookie to", () => {
    expect(() =>
      resolveCookiePolicy(
        "https://api.example.com",
        "https://app.example.com",
        true,
        ".com"
      )
    ).toThrow(/single label/u);
  });

  test("matches the declared domain case-insensitively, as a browser does", () => {
    expect(
      resolveCookiePolicy(
        "https://API.Example.com",
        "https://App.Example.com",
        true,
        ".Example.COM"
      )
    ).toEqual({ httpOnly: true, sameSite: "lax", secure: true });
  });

  test("refuses a trailing dot, which the browser is sent verbatim", () => {
    expect(() =>
      resolveCookiePolicy(
        "https://api.example.com",
        "https://app.example.com",
        true,
        ".example.com."
      )
    ).toThrow(/trailing dot/u);
  });
});

import { describe, expect, it } from "bun:test";

import { isInCountryScope, mergeCountryScopes } from "./merchant-scope";

describe("mergeCountryScopes", () => {
  it("unions narrow scopes", () => {
    expect(mergeCountryScopes([["FR"], ["BE", "FR"]])).toEqual(["BE", "FR"]);
  });

  it("keeps a worldwide scope worldwide", () => {
    // NSI ships McDonald's as worldwide in seven categories and US-scoped in
    // others; unioning would have hidden it from every batch but those.
    expect(mergeCountryScopes([[], ["US", "HK"]])).toEqual([]);
    expect(mergeCountryScopes([["US", "HK"], []])).toEqual([]);
  });

  it("treats a Wikidata country of origin as unable to narrow", () => {
    // Adidas is worldwide in NSI and P17=DE in Wikidata: DE is where it comes
    // from, not where it trades.
    expect(mergeCountryScopes([[], ["DE"]])).toEqual([]);
  });

  it("returns worldwide for no scopes at all", () => {
    expect(mergeCountryScopes([])).toEqual([]);
  });
});

describe("isInCountryScope", () => {
  const wanted = new Set(["FR"]);

  it("keeps a merchant scoped to a wanted country", () => {
    expect(isInCountryScope(["FR"], wanted)).toBe(true);
    expect(isInCountryScope(["BE", "FR"], wanted)).toBe(true);
  });

  it("keeps a worldwide merchant whatever the batch wants", () => {
    expect(isInCountryScope([], wanted)).toBe(true);
    expect(isInCountryScope(undefined, wanted)).toBe(true);
  });

  it("drops a merchant scoped only elsewhere", () => {
    expect(isInCountryScope(["JP"], wanted)).toBe(false);
  });

  it("keeps everything when no scope is wanted", () => {
    expect(isInCountryScope(["JP"], null)).toBe(true);
    expect(isInCountryScope([], null)).toBe(true);
  });
});

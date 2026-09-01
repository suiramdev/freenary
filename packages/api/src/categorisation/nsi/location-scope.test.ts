import { describe, expect, it } from "bun:test";

import { resolveNsiCountries } from "./location-scope";

describe("resolveNsiCountries", () => {
  it("reads plain ISO country codes", () => {
    expect(resolveNsiCountries(["fr", "be", "lu"])).toEqual(["BE", "FR", "LU"]);
  });

  it("folds metropolitan France onto FR", () => {
    // `fx` carries more French brands than `fr`, so losing it would leave the
    // French scope at a third of its real size.
    expect(resolveNsiCountries(["fx"])).toEqual(["FR"]);
    expect(resolveNsiCountries(["fr", "fx"])).toEqual(["FR"]);
  });

  it("takes the country from a subdivision or region file", () => {
    expect(resolveNsiCountries(["gb-eng", "gb-sct"])).toEqual(["GB"]);
    expect(resolveNsiCountries(["fr-ara.geojson"])).toEqual(["FR"]);
    expect(resolveNsiCountries(["us-hi", "us-ak"])).toEqual(["US"]);
  });

  it("refuses codes that name no single country", () => {
    // UN M49: 001 is the world, 150 is Europe, 419 Latin America.
    expect(resolveNsiCountries(["001", "150", "419"])).toEqual([]);
    expect(resolveNsiCountries(["conus", "northern cyprus"])).toEqual([]);
    expect(resolveNsiCountries([{ coordinates: [], type: "Polygon" }])).toEqual(
      []
    );
  });

  it("refuses NSI's non-ISO country codes rather than guessing", () => {
    // `ja` is Japan in some NSI entries and Jamaica in others, so resolving it
    // either way would invent a fact. The rest are simply not ISO.
    expect(resolveNsiCountries(["ja"])).toEqual([]);
    expect(resolveNsiCountries(["el", "ra", "pi", "kv"])).toEqual([]);
  });

  it("keeps the countries it can read when a set mixes shapes", () => {
    expect(
      resolveNsiCountries(["fr", "ja", "001", "gb-eng", "conus", "fx"])
    ).toEqual(["FR", "GB"]);
  });

  it("treats an absent or empty scope as unscoped", () => {
    expect(resolveNsiCountries()).toEqual([]);
    expect(resolveNsiCountries([])).toEqual([]);
  });

  it("refuses malformed two-character tokens instead of throwing", () => {
    // `Intl.DisplayNames.of` throws RangeError on anything that is not a
    // well-formed region subtag, which would abort the whole build.
    for (const token of ["12", "1a", "a1", "--", "f-", "é!"]) {
      expect(resolveNsiCountries([token])).toEqual([]);
    }
  });
});

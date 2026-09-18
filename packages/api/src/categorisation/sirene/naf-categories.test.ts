import { describe, expect, it } from "bun:test";

import type { SpendingCategory } from "../../lib/taxonomy";
import { mapNafToCategory } from "./naf-categories";

const SIRENE_SUBCLASS_CODES = {
  "47.11B": "groceries",
  "47.30Z": "fuel",
  "47.52A": "home-maintenance",
  "47.61Z": "hobbies",
  "47.63Z": "hobbies",
  "47.64Z": "sports",
  "47.65Z": "hobbies",
  "47.73Z": "pharmacy",
  "47.74Z": "medical",
  "47.75Z": "personal-care",
  "47.78A": "medical",
  "47.78B": "energy",
  "49.32A": "taxi",
  "56.10A": "restaurants",
  "56.10C": "takeaway",
  "56.30Z": "bars-cafes",
  "68.20B": "rent",
  "68.32A": "home-charges",
  "77.11A": "other-travel",
} as const satisfies Record<string, SpendingCategory>;

const SAME_MERCHANT_KIND_IN_MCC_AND_OSM_TABLES = [
  {
    category: "other-travel",
    mcc: 7512,
    nafCode: "77.11A",
    osmTag: "amenity=car_rental",
  },
  { category: "hobbies", mcc: 5942, nafCode: "47.61Z", osmTag: "shop=books" },
  { category: "fuel", mcc: 5541, nafCode: "47.30Z", osmTag: "amenity=fuel" },
  {
    category: "other-financial",
    mcc: 6012,
    nafCode: "64.19Z",
    osmTag: "amenity=bank",
  },
  {
    category: "medical",
    mcc: 8043,
    nafCode: "47.78A",
    osmTag: "shop=optician",
  },
  {
    category: "medical",
    mcc: 5975,
    nafCode: "47.74Z",
    osmTag: "shop=hearing_aids",
  },
  { category: "hobbies", mcc: 5735, nafCode: "47.63Z", osmTag: null },
  { category: "energy", mcc: 5983, nafCode: "47.78B", osmTag: null },
] as const satisfies readonly {
  readonly category: SpendingCategory;
  readonly mcc: number;
  readonly nafCode: string;
  readonly osmTag: string | null;
}[];

describe("mapNafToCategory", () => {
  it("resolves a real code through its class, not its division", () => {
    for (const [code, category] of Object.entries(SIRENE_SUBCLASS_CODES)) {
      expect(mapNafToCategory(code)).toBe(category);
    }
  });

  it("falls back to the division's catch-all when no class matches", () => {
    expect(mapNafToCategory("47.99Z")).toBe("other-shopping");
    expect(mapNafToCategory("85.59A")).toBe("other-education");
    expect(mapNafToCategory("49.39B")).toBe("other-transport");
    expect(mapNafToCategory("68.31Z")).toBe("other-housing");
  });

  it("agrees with the other signal tables on the same merchant kind", () => {
    for (const {
      category,
      nafCode,
    } of SAME_MERCHANT_KIND_IN_MCC_AND_OSM_TABLES) {
      expect(mapNafToCategory(nafCode)).toBe(category);
    }
  });

  it("returns null for an empty or unknown code", () => {
    expect(mapNafToCategory("")).toBeNull();
    expect(mapNafToCategory("99.99Z")).toBeNull();
  });

  it("refuses pre-2008 NAF rev. 1 codes instead of reading them as rev. 2", () => {
    expect(mapNafToCategory("51.4S")).toBeNull();
    expect(mapNafToCategory("51.4F")).toBeNull();
    expect(mapNafToCategory("52.4Z")).toBeNull();
    expect(mapNafToCategory("51.10Z")).toBe("flights");
  });

  it("refuses malformed codes rather than reading their leading digits", () => {
    expect(mapNafToCategory("4711B")).toBeNull();
    expect(mapNafToCategory("47")).toBeNull();
    expect(mapNafToCategory("47.")).toBeNull();
    expect(mapNafToCategory("47.11BZ")).toBeNull();
    expect(mapNafToCategory("not a code")).toBeNull();
  });
});

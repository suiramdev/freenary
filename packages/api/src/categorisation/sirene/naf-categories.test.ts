import { describe, expect, it } from "bun:test";

import type { SpendingCategory } from "../../lib/taxonomy";
import { mapNafToCategory } from "./naf-categories";

describe("mapNafToCategory", () => {
  it("resolves a real code through its class, not its division", () => {
    // SIRENE reports codes with a trailing sub-class letter. If the letter-strip
    // step missed, every one of these would fall through to its division and
    // land in the wrong group.
    const byClass = {
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
    for (const [code, category] of Object.entries(byClass)) {
      expect(mapNafToCategory(code)).toBe(category);
    }
  });

  it("falls back to the division when no class matches", () => {
    // A division names a group at best, so it resolves to that group's catch-all.
    expect(mapNafToCategory("47.99Z")).toBe("other-shopping");
    expect(mapNafToCategory("85.59A")).toBe("other-education");
    expect(mapNafToCategory("49.39B")).toBe("other-transport");
    // Division 68 spans letting, agency fees and syndic charges alike.
    expect(mapNafToCategory("68.31Z")).toBe("other-housing");
  });

  it("agrees with the other signal tables on the same merchant kind", () => {
    // A merchant must not change category with the signal that matched
    // it. Each of these previously split between NAF and the MCC/OSM tables.
    // 77.11 car rental — MCC 7512, amenity=car_rental
    expect(mapNafToCategory("77.11A")).toBe("other-travel");
    // 47.61 books — MCC 5942, shop=books
    expect(mapNafToCategory("47.61Z")).toBe("hobbies");
    // 47.30 fuel retail — MCC 5541, amenity=fuel
    expect(mapNafToCategory("47.30Z")).toBe("fuel");
    // 64.19 banking — MCC 6012, amenity=bank
    expect(mapNafToCategory("64.19Z")).toBe("other-financial");
    // 47.78A optical — MCC 8043, shop=optician
    expect(mapNafToCategory("47.78A")).toBe("medical");
    // 47.74 medical articles — MCC 5975, shop=hearing_aids
    expect(mapNafToCategory("47.74Z")).toBe("medical");
    // 47.63 recorded media — MCC 5735
    expect(mapNafToCategory("47.63Z")).toBe("hobbies");
    // 47.78B household fuels — MCC 5983
    expect(mapNafToCategory("47.78B")).toBe("energy");
  });

  it("returns null for an empty or unknown code", () => {
    expect(mapNafToCategory("")).toBeNull();
    expect(mapNafToCategory("99.99Z")).toBeNull();
  });

  it("refuses pre-2008 NAF rev. 1 codes instead of reading them as rev. 2", () => {
    // Rev. 1 groups carry one digit after the dot. Reinterpreting them under
    // rev. 2 silently moves a merchant: rev. 1 division 51 was wholesale, rev. 2
    // is air transport, so 51.4S would otherwise resolve to `flights`.
    expect(mapNafToCategory("51.4S")).toBeNull();
    expect(mapNafToCategory("51.4F")).toBeNull();
    expect(mapNafToCategory("52.4Z")).toBeNull();
    // The rev. 2 code that shares the division still resolves.
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

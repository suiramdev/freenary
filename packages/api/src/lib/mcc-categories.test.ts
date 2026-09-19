import { describe, expect, it } from "bun:test";

import { categoryFromMcc } from "./mcc-categories";
import type { SpendingCategory } from "./taxonomy";

describe("categoryFromMcc", () => {
  it("reads a listed code", () => {
    expect(categoryFromMcc("5411")).toBe("groceries");
  });

  it("splits the issuer-assigned 3xxx block at its real boundaries", () => {
    const byMcc = {
      "3000": "flights",
      "3299": "flights",
      "3300": "other-travel",
      "3499": "other-travel",
      "3500": "accommodation",
      "3999": "accommodation",
    } as const satisfies Record<string, SpendingCategory>;

    for (const [mcc, expected] of Object.entries(byMcc)) {
      expect(categoryFromMcc(mcc)).toBe(expected);
    }
  });

  it("returns null for a code it does not list", () => {
    expect(categoryFromMcc("2999")).toBeNull();
    expect(categoryFromMcc("4000")).toBeNull();
    expect(categoryFromMcc("not-a-code")).toBeNull();
  });
});

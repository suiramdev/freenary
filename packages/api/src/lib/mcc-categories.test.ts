import { describe, expect, it } from "bun:test";

import { categoryFromMcc } from "./mcc-categories";
import type { SpendingCategory } from "./taxonomy";

describe("categoryFromMcc", () => {
  it("reads a listed code", () => {
    expect(categoryFromMcc("5411")).toBe("groceries");
  });

  it("reads the whole issuer-assigned 3xxx block as one category", () => {
    const byMcc = {
      "3000": "transport-travel",
      "3299": "transport-travel",
      "3300": "transport-travel",
      "3499": "transport-travel",
      "3500": "transport-travel",
      "3999": "transport-travel",
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

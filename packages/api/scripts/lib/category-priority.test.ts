import { describe, expect, it } from "bun:test";

import { categoryPriority } from "./category-priority";

describe("categoryPriority", () => {
  it("keeps incidental retail below the intent it is bolted onto", () => {
    // A chain's beauty aisle or DIY yard is as incidental as a gift shop, so it
    // must lose to what the brand is actually for.
    expect(categoryPriority("personal-care")).toBeLessThan(
      categoryPriority("pharmacy")
    );
    expect(categoryPriority("home-maintenance")).toBeGreaterThan(
      categoryPriority("fuel")
    );
    expect(categoryPriority("household-supplies")).toBeLessThan(
      categoryPriority("groceries")
    );
  });

  it("keeps groceries above eating out", () => {
    // A supermarket with a café is a supermarket. Equal ranks would resolve on
    // whichever entry the NSI scan reached first, making the build order-dependent.
    for (const eatingOut of [
      "restaurants",
      "takeaway",
      "bars-cafes",
    ] as const) {
      expect(categoryPriority("groceries")).toBeGreaterThan(
        categoryPriority(eatingOut)
      );
    }
  });

  it("keeps fuel and generic shopping the most incidental of all", () => {
    for (const specific of [
      "groceries",
      "pharmacy",
      "accommodation",
    ] as const) {
      expect(categoryPriority(specific)).toBeGreaterThan(
        categoryPriority("fuel")
      );
      expect(categoryPriority(specific)).toBeGreaterThan(
        categoryPriority("other-shopping")
      );
    }
  });

  it("ranks a brand with only fuel entries above nothing at all", () => {
    expect(categoryPriority("fuel")).toBeGreaterThan(
      categoryPriority("uncategorised")
    );
  });
});

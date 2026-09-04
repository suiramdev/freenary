import { describe, expect, test } from "bun:test";

import { budgetLineKindOf, budgetLineKindOfGroup } from "./budget-profile";

const ref = (
  categorySlug: string | null,
  parentSlug: string | null = null
) => ({
  categorySlug,
  parentSlug,
});

describe("budgetLineKindOfGroup", () => {
  test("reads income as a revenue and investments as an investment", () => {
    expect(budgetLineKindOfGroup("income")).toBe("REVENUE");
    expect(budgetLineKindOfGroup("investments")).toBe("INVESTMENT");
  });

  test("reads every other group as an outgoing", () => {
    expect(budgetLineKindOfGroup("housing")).toBe("OUTGOING");
    expect(budgetLineKindOfGroup("taxes")).toBe("OUTGOING");
  });

  test("reads a custom group of its own as an outgoing", () => {
    expect(budgetLineKindOfGroup("custom:abc123")).toBe("OUTGOING");
    expect(budgetLineKindOfGroup(null)).toBe("OUTGOING");
  });
});

describe("budgetLineKindOf", () => {
  test("derives the kind from a predefined category's group", () => {
    expect(budgetLineKindOf(ref("salary"))).toBe("REVENUE");
    expect(budgetLineKindOf(ref("savings"))).toBe("INVESTMENT");
    expect(budgetLineKindOf(ref("rent"))).toBe("OUTGOING");
  });

  test("derives the kind from a custom category's parent group", () => {
    expect(budgetLineKindOf(ref(null, "income"))).toBe("REVENUE");
    expect(budgetLineKindOf(ref(null, "investments"))).toBe("INVESTMENT");
    expect(budgetLineKindOf(ref(null, "leisure"))).toBe("OUTGOING");
  });

  test("follows a re-parented custom category rather than a stored kind", () => {
    const savingsPot = ref(null, "investments");
    expect(budgetLineKindOf(savingsPot)).toBe("INVESTMENT");
    expect(budgetLineKindOf({ ...savingsPot, parentSlug: "leisure" })).toBe(
      "OUTGOING"
    );
  });

  test("resolves a legacy slug before mapping it", () => {
    expect(budgetLineKindOf(ref("income"))).toBe("REVENUE");
  });
});

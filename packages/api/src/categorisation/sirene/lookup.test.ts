import { describe, expect, test } from "bun:test";

import { mapNafToCategory } from "./naf-categories";

describe("mapNafToCategory", () => {
  test("food-dominant retail (class override) → groceries", () => {
    expect(mapNafToCategory("47.11B")).toBe("groceries");
  });

  test("restaurant → dining", () => {
    expect(mapNafToCategory("56.10A")).toBe("dining");
  });

  test("general medical practice → health", () => {
    expect(mapNafToCategory("86.21")).toBe("health");
  });

  test("pharmacy (class override) → health", () => {
    expect(mapNafToCategory("47.73Z")).toBe("health");
  });

  test("clothing retail (no override) → shopping", () => {
    expect(mapNafToCategory("47.71Z")).toBe("shopping");
  });

  test("unknown NAF code → null", () => {
    expect(mapNafToCategory("99.99")).toBe(null);
  });

  test("empty string → null", () => {
    expect(mapNafToCategory("")).toBe(null);
  });

  test("land transport → transport", () => {
    expect(mapNafToCategory("49.10Z")).toBe("transport");
  });

  test("accommodation → travel", () => {
    expect(mapNafToCategory("55.10Z")).toBe("travel");
  });

  test("education → education", () => {
    expect(mapNafToCategory("85.20Z")).toBe("education");
  });

  test("insurance → insurance", () => {
    expect(mapNafToCategory("66.11Z")).toBe("insurance");
  });

  test("financial services → transfers", () => {
    expect(mapNafToCategory("64.19Z")).toBe("transfers");
  });

  test("motor vehicle trade → transport", () => {
    expect(mapNafToCategory("45.11Z")).toBe("transport");
  });

  test("food/beverage retail group → groceries", () => {
    expect(mapNafToCategory("47.21Z")).toBe("groceries");
  });

  test("sports/recreation → entertainment", () => {
    expect(mapNafToCategory("93.11Z")).toBe("entertainment");
  });

  test("hairdressers / personal services → shopping", () => {
    expect(mapNafToCategory("96.02A")).toBe("shopping");
  });
});

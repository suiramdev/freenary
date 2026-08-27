import { describe, expect, test } from "bun:test";

import { getBusinessRegistryAdapter } from "./registry";

describe("getBusinessRegistryAdapter", () => {
  test("returns adapter for FR", () => {
    const adapter = getBusinessRegistryAdapter("FR");
    expect(adapter).not.toBeNull();
    expect(adapter?.country).toBe("FR");
  });

  test("is case-insensitive", () => {
    const adapter = getBusinessRegistryAdapter("fr");
    expect(adapter).not.toBeNull();
    expect(adapter?.country).toBe("FR");
  });

  test("returns null for unsupported country", () => {
    expect(getBusinessRegistryAdapter("XX")).toBeNull();
    expect(getBusinessRegistryAdapter("DE")).toBeNull();
    expect(getBusinessRegistryAdapter("US")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(getBusinessRegistryAdapter("")).toBeNull();
  });
});

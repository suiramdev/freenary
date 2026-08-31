import { describe, expect, it } from "bun:test";

import { predefinedCategoryGroups } from "@freenary/api/lib/categories";
import type { CategoryEntry } from "@freenary/api/lib/categories";

import { toCategorySections } from "./category-sections";
import type { CategorySection } from "./category-sections";

const custom = (
  id: string,
  label: string,
  parentKey: string | null
): CategoryEntry => ({
  color: "blue",
  icon: "HouseIcon",
  isAssignable: true,
  isCustom: true,
  // A custom category with no parent is a group of the user's own.
  isGroup: parentKey === null,
  key: `custom:${id}`,
  label,
  parentKey,
  usageCount: 0,
});

/** Mirrors listCategories: each group, its categories, its customs, then top-level customs. */
const listCategories = (customs: CategoryEntry[]): CategoryEntry[] => {
  const out: CategoryEntry[] = [];
  for (const { categories, group } of predefinedCategoryGroups()) {
    out.push(group, ...categories);
    for (const entry of customs) {
      if (entry.parentKey === group.key) {
        out.push(entry);
      }
    }
  }
  for (const entry of customs) {
    if (entry.parentKey === null) {
      out.push(entry);
    }
  }
  return out;
};

const keysOf = (sections: CategorySection[]) =>
  sections.flatMap((section) => section.items.map((item) => item.key));

describe("toCategorySections", () => {
  it("puts every predefined category under its own group heading", () => {
    const sections = toCategorySections(listCategories([]), "");
    expect(sections).toHaveLength(16);
    expect(keysOf(sections)).toHaveLength(75);
    for (const section of sections) {
      const { heading } = section;
      if (!heading) {
        throw new Error("every predefined section has a heading");
      }
      for (const item of section.items) {
        expect(item.parentKey).toBe(heading.key);
      }
    }
  });

  it("nests a custom category under its group", () => {
    const sections = toCategorySections(
      listCategories([custom("a", "Garage rent", "housing")]),
      ""
    );
    const housing = sections.find((s) => s.heading?.key === "housing");
    expect(housing?.items.at(-1)?.key).toBe("custom:a");
  });

  it("gives each top-level custom category its own unique section", () => {
    // Keying these alike would collide inside one radio group.
    const sections = toCategorySections(
      listCategories([
        custom("a", "Hustle one", null),
        custom("b", "Hustle two", null),
      ]),
      ""
    );
    const headless = sections.filter((s) => s.heading === null);
    expect(headless).toHaveLength(2);
    expect(new Set(sections.map((s) => s.key)).size).toBe(sections.length);
  });

  it("keeps a custom section distinct from a group whose label it copies", () => {
    const sections = toCategorySections(
      listCategories([custom("a", "Housing", null)]),
      ""
    );
    expect(new Set(sections.map((s) => s.key)).size).toBe(sections.length);
  });

  it("drops headings left with nothing under them", () => {
    const sections = toCategorySections(listCategories([]), "rent");
    expect(sections.map((s) => s.heading?.label)).toEqual([
      "Income",
      "Housing",
    ]);
    expect(keysOf(sections)).toEqual(["rental-income", "rent"]);
  });

  it("matches custom categories too, keeping their sections unique", () => {
    const sections = toCategorySections(
      listCategories([
        custom("a", "Zzz solo", null),
        custom("b", "Zzz nested", "housing"),
      ]),
      "zzz"
    );
    expect(keysOf(sections).toSorted()).toEqual(["custom:a", "custom:b"]);
    expect(new Set(sections.map((s) => s.key)).size).toBe(sections.length);
  });

  it("never drops or duplicates an entry", () => {
    const customs = [
      custom("a", "Garage", "housing"),
      custom("b", "Hustle", null),
      custom("c", "Gym", "leisure"),
    ];
    const all = listCategories(customs);
    const rendered = keysOf(toCategorySections(all, ""));
    const assignable = all
      .filter((entry) => entry.isAssignable)
      .map((entry) => entry.key);
    expect(rendered.toSorted()).toEqual(assignable.toSorted());
  });
});

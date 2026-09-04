import { describe, expect, it } from "bun:test";

import { CATEGORY_GROUPS, categoriesInGroup } from "@freenary/api/lib/taxonomy";

import { matchCategoryGroups } from "./category-search";

const groupsOf = (query: string) =>
  matchCategoryGroups(query).map((match) => match.group);

const categoriesOf = (query: string) =>
  matchCategoryGroups(query).flatMap((match) => match.categories);

describe("matchCategoryGroups", () => {
  it("offers the whole taxonomy when nothing is typed", () => {
    for (const query of ["", "   "]) {
      const matches = matchCategoryGroups(query);
      expect(matches.map((match) => match.group)).toEqual([...CATEGORY_GROUPS]);
      for (const { categories, group } of matches) {
        expect(categories).toEqual(categoriesInGroup(group));
      }
    }
  });

  it("keeps every category of a group whose own name matches", () => {
    // "Energy" and "Water" do not contain "utilities"; the group's name does.
    expect(matchCategoryGroups("utilities")).toEqual([
      { categories: categoriesInGroup("utilities"), group: "utilities" },
    ]);
  });

  it("keeps only the matching categories of a group named otherwise", () => {
    expect(matchCategoryGroups("groceries")).toEqual([
      { categories: ["groceries"], group: "daily-living" },
    ]);
  });

  it("drops a group left with nothing under it", () => {
    expect(groupsOf("groceries")).not.toContain("housing");
  });

  it("matches an accented label typed without its accents", () => {
    expect(categoriesOf("cafes")).toEqual(["bars-cafes"]);
  });

  it("returns nothing when no label matches", () => {
    expect(matchCategoryGroups("zzz")).toEqual([]);
  });
});

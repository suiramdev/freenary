import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import {
  CATEGORY_COLOR_VALUES,
  CATEGORY_GROUP_FALLBACKS,
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUP_OF,
  CATEGORY_GROUPS,
  CATEGORY_ICON_NAMES,
  CATEGORY_LABELS,
  LEGACY_CATEGORY_SLUGS,
  SPENDING_CATEGORIES,
  categoriesInGroup,
  categoryColor,
  categoryIcon,
  isCategoryGroup,
  isSpendingCategory,
  resolveCategorySlug,
} from "./taxonomy";
import type { CategoryGroup } from "./taxonomy";

describe("category hierarchy", () => {
  it("gives every category a group, a label and an appearance", () => {
    for (const category of SPENDING_CATEGORIES) {
      const group = CATEGORY_GROUP_OF[category];
      expect(CATEGORY_GROUPS).toContain(group);
      expect(CATEGORY_LABELS[category]).toBeTruthy();
      // Resolved against the declared palette, not against the definition of
      // categoryColor itself — that would compare the value to itself.
      expect(CATEGORY_COLOR_VALUES).toContain(categoryColor(category));
      expect(CATEGORY_ICON_NAMES).toContain(categoryIcon(category));
    }
  });

  it("partitions the categories across the groups", () => {
    const seen = new Set<string>();
    for (const group of CATEGORY_GROUPS) {
      const categories = categoriesInGroup(group);
      // An empty group would render as a Sankey node with nothing under it.
      expect(categories.length).toBeGreaterThan(0);
      for (const category of categories) {
        expect(seen.has(category)).toBe(false);
        seen.add(category);
      }
    }
    expect(seen.size).toBe(SPENDING_CATEGORIES.length);
  });

  it("keeps each group's categories contiguous and in group order", () => {
    // The pickers render SPENDING_CATEGORIES top to bottom under group
    // headings, so a category out of place would appear under the wrong one.
    const order = SPENDING_CATEGORIES.map(
      (category) => CATEGORY_GROUP_OF[category]
    );
    const runs: CategoryGroup[] = [];
    for (const group of order) {
      if (runs.at(-1) !== group) {
        runs.push(group);
      }
    }
    expect(runs).toEqual([...CATEGORY_GROUPS]);
  });

  it("points every group fallback at a category of that same group", () => {
    for (const group of CATEGORY_GROUPS) {
      const fallback = CATEGORY_GROUP_FALLBACKS[group];
      expect(isSpendingCategory(fallback)).toBe(true);
      expect(CATEGORY_GROUP_OF[fallback]).toBe(group);
    }
  });

  it("labels every group", () => {
    for (const group of CATEGORY_GROUPS) {
      expect(CATEGORY_GROUP_LABELS[group]).toBeTruthy();
      expect(isCategoryGroup(group)).toBe(true);
    }
  });

  it("separates the group and category key spaces", () => {
    // A budget line stores one slug and the pickers key React lists by it, so a
    // slug that is both a group and a category is ambiguous.
    for (const group of CATEGORY_GROUPS) {
      expect(isSpendingCategory(group)).toBe(false);
    }
    for (const category of SPENDING_CATEGORIES) {
      expect(isCategoryGroup(category)).toBe(false);
    }
  });
});

describe("resolveCategorySlug", () => {
  it("returns every current category unchanged", () => {
    for (const category of SPENDING_CATEGORIES) {
      expect(resolveCategorySlug(category)).toBe(category);
    }
  });

  it("maps every legacy slug to a current category", () => {
    for (const [legacy, current] of Object.entries(LEGACY_CATEGORY_SLUGS)) {
      expect(resolveCategorySlug(legacy)).toBe(current);
      expect(isSpendingCategory(current)).toBe(true);
    }
  });

  it("sends a slug that is also a group to that group's catch-all", () => {
    // Twelve group slugs are also legacy category values, so the key spaces
    // overlap in the legacy dimension. A caller handing a group slug here must
    // land on that group's own catch-all, never on another group's category.
    for (const group of CATEGORY_GROUPS) {
      if (Object.hasOwn(LEGACY_CATEGORY_SLUGS, group)) {
        expect(resolveCategorySlug(group)).toBe(
          CATEGORY_GROUP_FALLBACKS[group]
        );
      }
    }
  });

  it("covers the whole flat set that preceded the hierarchy", () => {
    const flatSet = [
      "dining",
      "education",
      "entertainment",
      "groceries",
      "health",
      "housing",
      "income",
      "insurance",
      "other",
      "savings",
      "shopping",
      "subscriptions",
      "taxes",
      "transfers",
      "transport",
      "travel",
      "utilities",
    ];
    for (const legacy of flatSet) {
      expect(resolveCategorySlug(legacy)).not.toBeNull();
    }
  });

  it("returns null for an unknown value", () => {
    expect(resolveCategorySlug("")).toBeNull();
    expect(resolveCategorySlug("not-a-category")).toBeNull();
    expect(resolveCategorySlug("Groceries")).toBeNull();
  });
});

describe("category hierarchy migration", () => {
  // The migration rewrites stored slugs with its own copy of the mapping. If it
  // drifts from the TS tables, rows land on categories the code cannot decode.
  const migrationSql = fs.readFileSync(
    path.resolve(
      import.meta.dirname,
      "../../../db/prisma/migrations/20260831120000_category_hierarchy/migration.sql"
    ),
    "utf-8"
  );

  // Scoped to the mapping INSERT so an unrelated tuple elsewhere in the file
  // cannot join the set. Parsing narrows through the same guards the runtime
  // uses, so a slug the SQL invents fails here rather than typing as a string.
  const insertBody = migrationSql.slice(
    migrationSql.indexOf('INSERT INTO "category_slug_migration"')
  );
  const mappingBody = insertBody.slice(0, insertBody.indexOf(";"));
  const mappingRow =
    /\('(?<legacy>[\w-]+)', '(?<category>[\w-]+)', '(?<group>[\w-]+)'\)/gu;

  const rows = [...mappingBody.matchAll(mappingRow)].map((match) => {
    const { category, group, legacy } = match.groups ?? {};
    if (
      !(
        legacy &&
        category &&
        group &&
        isSpendingCategory(category) &&
        isCategoryGroup(group)
      )
    ) {
      throw new Error(`Migration maps to an unknown slug: ${match[0]}`);
    }
    return { category, group, legacy };
  });

  it("maps each legacy slug exactly as LEGACY_CATEGORY_SLUGS does", () => {
    // The key sets must match, not merely their sizes: a duplicated row plus a
    // forgotten one would leave a stored slug the code decodes differently.
    expect(rows.map((row) => row.legacy).toSorted()).toEqual(
      Object.keys(LEGACY_CATEGORY_SLUGS).toSorted()
    );
    for (const row of rows) {
      expect(resolveCategorySlug(row.legacy)).toBe(row.category);
    }
  });

  it("reparents custom categories onto the new category's group", () => {
    for (const row of rows) {
      expect(CATEGORY_GROUP_OF[row.category]).toBe(row.group);
    }
  });
});

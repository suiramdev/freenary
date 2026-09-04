import prisma from "@freenary/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  MAX_AMOUNT_MINOR_UNITS,
  MAX_BUDGET_LINE_LABEL_LENGTH,
  MAX_BUDGET_LINES,
} from "../lib/budget-profile";
import {
  customCategoryKey,
  parseCategoryKey,
  predefinedCategoryGroups,
} from "../lib/categories";
import type { CategoryEntry } from "../lib/categories";
import {
  CATEGORY_COLOR_VALUES,
  CATEGORY_GROUP_FALLBACKS,
  CATEGORY_GROUPS,
  CATEGORY_ICON_NAMES,
  isCategoryGroup,
} from "../lib/taxonomy";
import type { CategoryColor, CategoryIconName } from "../lib/taxonomy";

/** Shared by createCustomCategory and updateCustomCategory. */
const customCategoryFields = {
  color: z.enum(CATEGORY_COLOR_VALUES),
  icon: z.enum(CATEGORY_ICON_NAMES),
  label: z.string().trim().min(1).max(40),
  // A custom category nests under a group, never under another category.
  parentSlug: z.enum(CATEGORY_GROUPS).nullable(),
};

const CATEGORY_SELECT = {
  _count: { select: { budgetLines: true } },
  color: true,
  icon: true,
  id: true,
  label: true,
  parentSlug: true,
} as const;

const toCategoryEntry = (custom: {
  _count: { budgetLines: number };
  color: string;
  icon: string;
  id: string;
  label: string;
  parentSlug: string | null;
}): CategoryEntry => ({
  // SAFETY: color and icon are only ever written through the zod-validated mutations in this file
  color: custom.color as CategoryColor,
  // SAFETY: color and icon are only ever written through the zod-validated mutations in this file
  icon: custom.icon as CategoryIconName,
  isAssignable: true,
  isCustom: true,
  // A top-level custom category is a group of the user's own, and stays
  // assignable because it holds no categories to pick instead.
  isGroup: custom.parentSlug === null,
  key: customCategoryKey(custom.id),
  label: custom.label,
  parentKey: custom.parentSlug,
  usageCount: custom._count.budgetLines,
});

/** Highest sortOrder within a parent group, so a new or re-parented row lands last. */
const nextSortOrder = async (userId: string, parentSlug: string | null) => {
  const last = await prisma.customCategory.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
    where: { parentSlug, userId },
  });
  return (last?.sortOrder ?? -1) + 1;
};

export const settingsRouter = {
  createCustomCategory: protectedProcedure
    .input(z.object({ ...customCategoryFields }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const clash = await prisma.customCategory.findFirst({
        select: { id: true },
        where: { label: { equals: input.label, mode: "insensitive" }, userId },
      });

      if (clash) {
        throw new ORPCError("CONFLICT", {
          message: "A category with that name already exists",
        });
      }

      const created = await prisma.customCategory.create({
        data: {
          color: input.color,
          icon: input.icon,
          label: input.label,
          parentSlug: input.parentSlug,
          sortOrder: await nextSortOrder(userId, input.parentSlug),
          userId,
        },
        select: { id: true },
      });

      return { key: customCategoryKey(created.id) };
    }),

  deleteCustomCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const category = await prisma.customCategory.findFirst({
        select: { id: true, parentSlug: true },
        where: { id: input.id, userId },
      });

      if (!category) {
        throw new ORPCError("NOT_FOUND", { message: "Category not found" });
      }

      // A budget line must land on a category, and the parent is a group, so
      // reassignment goes to that group's catch-all.
      const fallbackSlug =
        category.parentSlug && isCategoryGroup(category.parentSlug)
          ? CATEGORY_GROUP_FALLBACKS[category.parentSlug]
          : "uncategorised";

      // Reassigning before the delete is what keeps `onDelete: Restrict` satisfied,
      // so a budget line can never silently lose its category.
      const [reassigned] = await prisma.$transaction([
        prisma.budgetLine.updateMany({
          data: { categoryId: null, categorySlug: fallbackSlug },
          where: { categoryId: category.id },
        }),
        prisma.customCategory.delete({ where: { id: category.id } }),
      ]);

      return { fallbackSlug, reassignedLines: reassigned.count };
    }),

  getBudgetProfile: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;

    const lines = await prisma.budgetLine.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        amount: true,
        categoryId: true,
        categorySlug: true,
        id: true,
        label: true,
      },
      where: { userId },
    });

    return {
      lines: lines.map((line) => ({
        amount: line.amount,
        categoryKey: line.categoryId
          ? customCategoryKey(line.categoryId)
          : (line.categorySlug ?? "uncategorised"),
        id: line.id,
        label: line.label,
      })),
    };
  }),

  listCategories: protectedProcedure.handler(async ({ context }) => {
    const customs = await prisma.customCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: CATEGORY_SELECT,
      where: { userId: context.session.user.id },
    });

    const categories: CategoryEntry[] = [];

    for (const {
      categories: predefined,
      group,
    } of predefinedCategoryGroups()) {
      categories.push(group, ...predefined);
      for (const custom of customs) {
        if (custom.parentSlug === group.key) {
          categories.push(toCategoryEntry(custom));
        }
      }
    }

    // Groups of the user's own close the list, after every predefined group.
    for (const custom of customs) {
      if (custom.parentSlug === null) {
        categories.push(toCategoryEntry(custom));
      }
    }

    return { categories };
  }),

  moveCustomCategory: protectedProcedure
    .input(z.object({ direction: z.enum(["down", "up"]), id: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const current = await prisma.customCategory.findFirst({
        select: { id: true, parentSlug: true, sortOrder: true },
        where: { id: input.id, userId },
      });

      if (!current) {
        throw new ORPCError("NOT_FOUND", { message: "Category not found" });
      }

      const movingUp = input.direction === "up";

      const neighbour = await prisma.customCategory.findFirst({
        orderBy: { sortOrder: movingUp ? "desc" : "asc" },
        select: { id: true, sortOrder: true },
        where: {
          parentSlug: current.parentSlug,
          sortOrder: movingUp
            ? { lt: current.sortOrder }
            : { gt: current.sortOrder },
          userId,
        },
      });

      if (!neighbour) {
        return { moved: false };
      }

      await prisma.$transaction([
        prisma.customCategory.update({
          data: { sortOrder: neighbour.sortOrder },
          where: { id: current.id },
        }),
        prisma.customCategory.update({
          data: { sortOrder: current.sortOrder },
          where: { id: neighbour.id },
        }),
      ]);

      return { moved: true };
    }),

  saveBudgetProfile: protectedProcedure
    .input(
      z.object({
        lines: z
          .array(
            z.object({
              amount: z.number().int().min(0).max(MAX_AMOUNT_MINOR_UNITS),
              categoryKey: z.string(),
              // Optional: an empty name is stored as null and the category's
              // own name stands in when the line is displayed.
              label: z.string().trim().max(MAX_BUDGET_LINE_LABEL_LENGTH),
            })
          )
          .max(MAX_BUDGET_LINES),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const owned = await prisma.customCategory.findMany({
        select: { id: true },
        where: { userId },
      });
      const ownedIds = new Set(owned.map((category) => category.id));

      // sortOrder is the row's position in the profile — one flat list, so it
      // is the whole ordering getBudgetProfile reads back.
      const data = input.lines.map((line, index) => {
        const parsed = parseCategoryKey(line.categoryKey);

        if (!parsed || (parsed.customId && !ownedIds.has(parsed.customId))) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Unknown category: ${line.categoryKey}`,
          });
        }

        return {
          amount: line.amount,
          categoryId: parsed.customId,
          categorySlug: parsed.slug,
          label: line.label || null,
          sortOrder: index,
          userId,
        };
      });

      await prisma.$transaction([
        prisma.budgetLine.deleteMany({ where: { userId } }),
        prisma.budgetLine.createMany({ data }),
      ]);

      return { lineCount: data.length };
    }),

  updateCustomCategory: protectedProcedure
    .input(z.object({ ...customCategoryFields, id: z.string() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const category = await prisma.customCategory.findFirst({
        select: { parentSlug: true, sortOrder: true },
        where: { id: input.id, userId },
      });

      if (!category) {
        throw new ORPCError("NOT_FOUND", { message: "Category not found" });
      }

      const clash = await prisma.customCategory.findFirst({
        select: { id: true },
        where: {
          id: { not: input.id },
          label: { equals: input.label, mode: "insensitive" },
          userId,
        },
      });

      if (clash) {
        throw new ORPCError("CONFLICT", {
          message: "A category with that name already exists",
        });
      }

      const reparented = category.parentSlug !== input.parentSlug;

      await prisma.customCategory.update({
        data: {
          color: input.color,
          icon: input.icon,
          label: input.label,
          parentSlug: input.parentSlug,
          sortOrder: reparented
            ? await nextSortOrder(userId, input.parentSlug)
            : category.sortOrder,
        },
        where: { id: input.id },
      });

      return { success: true as const };
    }),
};

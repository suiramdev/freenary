import prisma from "@freenary/db";
import type { Prisma } from "@freenary/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { matchInternalTransfers } from "../categorisation/internal-transfer";
import type { TransactionChannel } from "../categorisation/normalise/types";
import {
  cadenceWindow,
  detectRecurringExpenses,
  trailingYear,
} from "../categorisation/recurrence";
import { categoriseBatch } from "../categorisation/resolve";
import type { CategoriseInput, TransactionPath } from "../categorisation/types";
import {
  deleteUserOverride,
  upsertUserOverride,
} from "../categorisation/user-override";
import { protectedProcedure } from "../index";
import { findProviderUser } from "../lib/bank-provider-user";
import { syncConnection } from "../lib/bank-sync";
import { periodMonthCount, plannedByGroup } from "../lib/budget-planned";
import { budgetLineKindOf } from "../lib/budget-profile";
import { deriveCategory, effectiveCategory } from "../lib/mcc-categories";
import {
  CATEGORY_GROUP_OF,
  CATEGORY_GROUPS,
  SPENDING_CATEGORIES,
  categoriesInGroup,
} from "../lib/taxonomy";
import type { CategoryGroup, SpendingCategory } from "../lib/taxonomy";
import { getProvider } from "../providers/registry";

const cashFlowQuery = (labelExpr: string, truncExpr: string) =>
  `SELECT
    ${labelExpr} AS label,
    COALESCE(SUM(CASE WHEN t."amount" > 0 THEN t."amount" ELSE 0 END), 0)::bigint AS incoming,
    COALESCE(SUM(CASE WHEN t."amount" < 0 THEN ABS(t."amount") ELSE 0 END), 0)::bigint AS outgoing
  FROM "transaction" t
  JOIN "bank_account" ba ON ba."id" = t."accountId"
  JOIN "bank_connection" bc ON bc."id" = ba."connectionId"
  WHERE bc."userId" = $1
    AND t."date" >= $2
    AND t."date" <= $3
  GROUP BY ${truncExpr}, ${labelExpr}
  ORDER BY ${truncExpr} ASC`;

const aggregationSchema = z
  .enum(["total", "average", "median"])
  .default("total");

/** YYYY-MM key for a date, used to group transactions by calendar month. */
const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;

/** All YYYY-MM keys spanning from..to inclusive. */
const allMonthKeys = (from: Date, to: Date): string[] => {
  const keys: string[] = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    keys.push(monthKey(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return keys;
};

/** Median of a numeric array. Returns 0 for an empty array. */
const median = (values: number[]): number => {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid];
  if (upper === undefined) {
    return 0;
  }
  const lower = sorted[mid - 1];
  return lower !== undefined && sorted.length % 2 === 0
    ? Math.round((lower + upper) / 2)
    : upper;
};

/**
 * Collapse per-group monthly series into a single representative value.
 * Every group receives a value for each active month (zero-filled per group),
 * so a category with no transactions in an otherwise active month counts as 0.
 */
const aggregateMonthly = <K>(
  monthly: Map<K, Map<string, number>>,
  months: string[],
  mode: "average" | "median"
): Map<K, number> => {
  const result = new Map<K, number>();
  for (const [key, monthValues] of monthly) {
    const series = months.map((mk) => monthValues.get(mk) ?? 0);
    result.set(
      key,
      mode === "average"
        ? Math.round(series.reduce((s, v) => s + v, 0) / months.length)
        : median(series)
    );
  }
  return result;
};

// Outgoing spend, the basis every expense chart of a period shares

/**
 * One value per key: a plain sum for "total", otherwise the average or median
 * of each key's monthly series across the months that saw activity.
 */
const aggregateOutgoing = <T extends { amount: number; date: Date }, K>(
  transactions: T[],
  keyOf: (tx: T) => K,
  aggregation: "average" | "median" | "total",
  from: Date,
  to: Date
): Map<K, number> => {
  if (aggregation === "total") {
    const totals = new Map<K, number>();
    for (const tx of transactions) {
      const key = keyOf(tx);
      totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.amount));
    }
    return totals;
  }

  const activeMonthSet = new Set<string>();
  const monthly = new Map<K, Map<string, number>>();
  for (const tx of transactions) {
    const key = keyOf(tx);
    const mk = monthKey(tx.date);
    activeMonthSet.add(mk);
    let series = monthly.get(key);
    if (!series) {
      series = new Map();
      monthly.set(key, series);
    }
    series.set(mk, (series.get(mk) ?? 0) + Math.abs(tx.amount));
  }

  const active = allMonthKeys(from, to).filter((mk) => activeMonthSet.has(mk));
  return aggregateMonthly(monthly, active, aggregation);
};

/** A transaction row as the expense charts read it. */
interface OutgoingRow {
  amount: number;
  bankTransactionCode: string | null;
  category: string | null;
  counterpartyName: string | null;
  date: Date;
  merchantCategoryCode: string | null;
  merchantKey: string | null;
  resolvedCategory: string | null;
}

/** The outgoing rows every expense chart of a period shares: one WHERE clause. */
const outgoingRows = (
  userId: string,
  from: Date,
  to: Date
): Promise<OutgoingRow[]> =>
  prisma.transaction.findMany({
    select: {
      amount: true,
      bankTransactionCode: true,
      category: true,
      counterpartyName: true,
      date: true,
      merchantCategoryCode: true,
      merchantKey: true,
      resolvedCategory: true,
    },
    where: {
      account: { connection: { userId } },
      amount: { lt: 0 },
      date: { gte: from, lte: to },
    },
  });

/**
 * Outgoing spend per category: the one aggregate the breakdown, the budget
 * comparison and the fixed/variable split all derive from, so they reconcile.
 */
const outgoingByCategory = (
  rows: OutgoingRow[],
  aggregation: "average" | "median" | "total",
  from: Date,
  to: Date
): Map<SpendingCategory, number> =>
  aggregateOutgoing(rows, effectiveCategory, aggregation, from, to);

/**
 * Each category's recurring share of its raw period spend, the weight that
 * splits that category's aggregate into a fixed and a variable part.
 */
const recurringShareByCategory = (
  rows: OutgoingRow[],
  recurringKeys: Set<string>
): Map<SpendingCategory, number> => {
  const sums = new Map<SpendingCategory, { all: number; recurring: number }>();
  for (const row of rows) {
    const category = effectiveCategory(row);
    let categorySums = sums.get(category);
    if (!categorySums) {
      categorySums = { all: 0, recurring: 0 };
      sums.set(category, categorySums);
    }
    const amount = Math.abs(row.amount);
    categorySums.all += amount;
    if (row.merchantKey !== null && recurringKeys.has(row.merchantKey)) {
      categorySums.recurring += amount;
    }
  }

  const shares = new Map<SpendingCategory, number>();
  for (const [category, { all, recurring }] of sums) {
    shares.set(category, all > 0 ? recurring / all : 0);
  }
  return shares;
};

/**
 * Outgoing spend per category group. Categories are aggregated before being
 * folded into groups because a median of medians is not a group's median.
 */
const outgoingByGroup = async (
  userId: string,
  aggregation: "average" | "median" | "total",
  from: Date,
  to: Date
): Promise<Map<CategoryGroup, number>> => {
  const categoryAmounts = outgoingByCategory(
    await outgoingRows(userId, from, to),
    aggregation,
    from,
    to
  );

  // A 75-slice pie is unreadable, so the expense charts answer "which part of
  // life" at group level; the Sankey is where per-category detail lives.
  const groupAmounts = new Map<CategoryGroup, number>();
  for (const [category, amount] of categoryAmounts) {
    const group = CATEGORY_GROUP_OF[category];
    groupAmounts.set(group, (groupAmounts.get(group) ?? 0) + amount);
  }
  return groupAmounts;
};

/**
 * Drop the pipeline's own verdicts so the next batch re-decides them. Manual
 * overrides and internal-transfer flags are the user's, not the pipeline's, so
 * they survive. A connection id narrows it to that bank.
 */
const clearResolutions = (userId: string, connectionId?: string) =>
  prisma.transaction.updateMany({
    data: {
      resolutionConfidence: null,
      resolutionStage: null,
      resolvedCategory: null,
    },
    where: {
      account: {
        connection: connectionId ? { id: connectionId, userId } : { userId },
      },
      categoryOverride: false,
      isInternalTransfer: false,
    },
  });

// Batch categorisation of uncategorised transactions

const categoriseUncategorised = async (userId: string): Promise<number> => {
  // Find transactions that need categorisation:
  // no resolved category, not an internal transfer, no manual override
  const uncategorised = await prisma.transaction.findMany({
    select: {
      account: {
        select: {
          connection: {
            select: {
              institutionBic: true,
              institutionCountry: true,
            },
          },
        },
      },
      amount: true,
      bankTransactionCode: true,
      channel: true,
      counterpartyName: true,
      creditorAccountIban: true,
      id: true,
      merchantCategoryCode: true,
      merchantKey: true,
      normalisedDescriptor: true,
      remittanceLines: true,
      transactionPath: true,
    },
    where: {
      account: { connection: { userId } },
      categoryOverride: false,
      isInternalTransfer: false,
      resolvedCategory: null,
    },
  });

  if (uncategorised.length === 0) {
    return 0;
  }

  // Build categorisation inputs
  const inputs: (CategoriseInput & { txId: string })[] = [];

  for (const tx of uncategorised) {
    // A transaction with no merchant key skips the key-based stages inside the
    // pipeline; its code and country rules can still categorise it.
    const merchantKey = tx.merchantKey ?? "";
    const isIban =
      tx.creditorAccountIban && merchantKey === tx.creditorAccountIban;

    inputs.push({
      allowCloudInference: false,
      amountMinor: tx.amount,
      bankTransactionCode: tx.bankTransactionCode,
      // SAFETY: channel column stores validated TransactionChannel values or null
      channel: (tx.channel ?? "unknown") as TransactionChannel,
      counterpartyName: tx.counterpartyName,
      country: tx.account.connection.institutionCountry,
      creditorIban: tx.creditorAccountIban,
      merchantCategoryCode: tx.merchantCategoryCode,
      merchantKey,
      normalisedDescriptor: tx.normalisedDescriptor ?? "",
      // SAFETY: transactionPath column stores validated TransactionPath values or null
      path: (tx.transactionPath ??
        (isIban ? "iban" : "card")) as TransactionPath,
      rawDescriptor: tx.remittanceLines.join(" "),
      txId: tx.id,
      userId,
    });
  }

  if (inputs.length === 0) {
    return 0;
  }

  // Collect distinct institution countries for dictionary loading
  const countries = [
    ...new Set(
      uncategorised
        .map((tx) => tx.account.connection.institutionCountry)
        .filter((c): c is string => c !== null)
    ),
  ];

  // Run batch categorisation
  const results = await categoriseBatch(inputs, countries);

  // Write results back
  let updated = 0;
  for (let i = 0; i < inputs.length; i += 1) {
    const input = inputs[i];
    const result = results[i];
    if (!input || !result || !result.category) {
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop -- sequential DB writes
      await prisma.transaction.update({
        data: {
          intermediaryName: result.intermediaryName,
          resolutionConfidence: result.confidence,
          resolutionStage: result.stage,
          resolvedCategory: result.category,
        },
        where: { id: input.txId },
      });
      updated += 1;
    } catch {
      // Swallow individual update failures
    }
  }

  return updated;
};

// Router

export const budgetRouter = {
  getAccounts: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;

    const accounts = await prisma.bankAccount.findMany({
      select: {
        connection: {
          select: { institutionName: true },
        },
        iban: true,
        id: true,
        name: true,
      },
      where: {
        connection: { userId },
      },
    });

    // Date bounds of available transaction data — drives the period picker.
    const bounds = await prisma.transaction.aggregate({
      _max: { date: true },
      _min: { date: true },
      where: { account: { connection: { userId } } },
    });

    return {
      accounts: accounts.map((a) => ({
        iban: a.iban,
        id: a.id,
        institutionName: a.connection.institutionName,
        name: a.name,
      })),
      firstTransactionDate: bounds._min.date,
      hasAccounts: accounts.length > 0,
      lastTransactionDate: bounds._max.date,
    };
  }),

  getBudgetVsActual: protectedProcedure
    .input(
      z.object({
        aggregation: aggregationSchema,
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { aggregation, from, to } = input;

      const [lines, actualByGroup] = await Promise.all([
        prisma.budgetLine.findMany({
          select: {
            amount: true,
            category: { select: { parentSlug: true } },
            categorySlug: true,
          },
          where: { userId },
        }),
        outgoingByGroup(userId, aggregation, from, to),
      ]);

      // Income and investment lines are the other side of the profile's flow,
      // and this view compares outgoings only.
      const outgoings = lines
        .map((line) => ({
          amount: line.amount,
          categorySlug: line.categorySlug,
          parentSlug: line.category?.parentSlug ?? null,
        }))
        .filter((line) => budgetLineKindOf(line) === "OUTGOING");

      // A declared plan is monthly, so only a period total scales it up: the
      // average and median aggregations are already per-month figures.
      const monthCount =
        aggregation === "total" ? periodMonthCount(from, to, new Date()) : 1;
      const planned = plannedByGroup(outgoings, monthCount);

      // Walking the taxonomy unions both sides in a stable order; a group
      // neither planned nor spent in has nothing to compare.
      const groups = CATEGORY_GROUPS.map((group) => ({
        actual: actualByGroup.get(group) ?? 0,
        group,
        planned: planned.get(group) ?? 0,
      }))
        .filter((row) => row.planned > 0 || row.actual > 0)
        .toSorted((a, b) => b.planned - a.planned || b.actual - a.actual);

      return {
        groups,
        hasPlan: outgoings.length > 0,
      };
    }),

  getCashFlow: protectedProcedure
    .input(
      z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { from, to } = input;

      const diffDays = Math.ceil(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
      );

      let truncExpr: string;
      let labelExpr: string;

      if (diffDays <= 31) {
        truncExpr = `date_trunc('day', t."date")`;
        labelExpr = `to_char(t."date", 'YYYY-MM-DD')`;
      } else if (diffDays <= 93) {
        truncExpr = `date_trunc('week', t."date")`;
        labelExpr = `to_char(date_trunc('week', t."date"), 'YYYY-MM-DD')`;
      } else {
        truncExpr = `date_trunc('month', t."date")`;
        labelExpr = `to_char(date_trunc('month', t."date"), 'YYYY-MM')`;
      }

      // Dynamic SQL fragments are code-controlled (not user input); user values are parameterized
      const sql = cashFlowQuery(labelExpr, truncExpr);

      const periods = await prisma.$queryRawUnsafe<
        { incoming: bigint; label: string; outgoing: bigint }[]
      >(sql, userId, from, to);

      return {
        periods: periods.map((p) => ({
          incoming: Number(p.incoming),
          label: p.label,
          outgoing: Number(p.outgoing),
        })),
      };
    }),

  getFixedVsVariable: protectedProcedure
    .input(
      z.object({
        aggregation: aggregationSchema,
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { aggregation, from, to } = input;

      const [rows, recurring] = await Promise.all([
        outgoingRows(userId, from, to),
        // A cadence is judged from the year on each side of the period, so the
        // first months of a history do not read their rent as variable.
        detectRecurringExpenses(userId, cadenceWindow(from, to)),
      ]);

      // The split decomposes the breakdown's own per-category aggregate, so
      // fixed + variable equals the breakdown total in every aggregation;
      // aggregating a fixed and a variable series apart would not, because a
      // median is not additive.
      const byCategory = outgoingByCategory(rows, aggregation, from, to);

      const recurringShare = recurringShareByCategory(
        rows,
        new Set(recurring.map((e) => e.merchantKey))
      );

      let fixed = 0;
      let total = 0;
      for (const [category, amount] of byCategory) {
        fixed += Math.round(amount * (recurringShare.get(category) ?? 0));
        total += amount;
      }

      // Deriving one side by subtraction keeps the pair summing to the total
      // whichever way the per-category rounding went.
      return { fixed, variable: total - fixed };
    }),
  getRecurringExpenses: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const expenses = await detectRecurringExpenses(userId, trailingYear());
    return {
      expenses: expenses.map((e) => ({
        category: e.category,
        currency: e.currency,
        frequency: e.frequency,
        intervalDays: e.intervalDays,
        lastSeen: e.lastSeen.toISOString(),
        merchantKey: e.merchantKey,
        merchantName: e.merchantName,
        nextExpected: e.nextExpected.toISOString(),
        occurrences: e.occurrences,
        typicalAmountMinor: e.typicalAmountMinor,
      })),
    };
  }),

  getSankeyData: protectedProcedure
    .input(
      z.object({
        aggregation: aggregationSchema,
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { aggregation, from, to } = input;

      const transactions = await prisma.transaction.findMany({
        select: {
          amount: true,
          bankTransactionCode: true,
          category: true,
          counterpartyName: true,
          date: true,
          merchantCategoryCode: true,
          resolvedCategory: true,
        },
        where: {
          account: { connection: { userId } },
          date: { gte: from, lte: to },
        },
      });

      let incomeSources: Map<string, number>;
      let expenseCategories: Map<SpendingCategory, number>;

      if (aggregation === "total") {
        incomeSources = new Map();
        expenseCategories = new Map();
        for (const tx of transactions) {
          if (tx.amount > 0) {
            const source = tx.counterpartyName ?? "Other Income";
            incomeSources.set(
              source,
              (incomeSources.get(source) ?? 0) + tx.amount
            );
          } else {
            const category = effectiveCategory(tx);
            const abs = Math.abs(tx.amount);
            expenseCategories.set(
              category,
              (expenseCategories.get(category) ?? 0) + abs
            );
          }
        }
      } else {
        const months = allMonthKeys(from, to);
        const activeMonthSet = new Set<string>();
        const monthlyIncome = new Map<string, Map<string, number>>();
        const monthlyExpense = new Map<SpendingCategory, Map<string, number>>();

        for (const tx of transactions) {
          const mk = monthKey(tx.date);
          activeMonthSet.add(mk);
          if (tx.amount > 0) {
            const source = tx.counterpartyName ?? "Other Income";
            let srcMonths = monthlyIncome.get(source);
            if (!srcMonths) {
              srcMonths = new Map();
              monthlyIncome.set(source, srcMonths);
            }
            srcMonths.set(mk, (srcMonths.get(mk) ?? 0) + tx.amount);
          } else {
            const category = effectiveCategory(tx);
            const abs = Math.abs(tx.amount);
            let catMonths = monthlyExpense.get(category);
            if (!catMonths) {
              catMonths = new Map();
              monthlyExpense.set(category, catMonths);
            }
            catMonths.set(mk, (catMonths.get(mk) ?? 0) + abs);
          }
        }

        // Only count months that have at least one transaction so that
        // months before the bank was connected don't dilute the result.
        const active = months.filter((mk) => activeMonthSet.has(mk));

        incomeSources = aggregateMonthly(monthlyIncome, active, aggregation);
        expenseCategories = aggregateMonthly(
          monthlyExpense,
          active,
          aggregation
        );
      }

      const incomeNodes = [...incomeSources.entries()]
        .toSorted((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      // Collapse remaining income sources into "Other Income"
      const remainingIncome = [...incomeSources.entries()]
        .toSorted((a, b) => b[1] - a[1])
        .slice(10)
        .reduce((sum, [, v]) => sum + v, 0);
      if (remainingIncome > 0) {
        const existing = incomeNodes.find((n) => n.name === "Other Income");
        if (existing) {
          existing.value += remainingIncome;
        } else {
          incomeNodes.push({ name: "Other Income", value: remainingIncome });
        }
      }

      // Level 3 folded into level 2. A group's value is the sum of its
      // categories even under median, because every ribbon out of a group node
      // must add up to the node itself — a median of medians would not.
      const byGroup = new Map<
        CategoryGroup,
        { category: SpendingCategory; value: number }[]
      >();
      for (const [category, value] of expenseCategories) {
        if (value <= 0) {
          continue;
        }
        const group = CATEGORY_GROUP_OF[category];
        const leaves = byGroup.get(group);
        const leaf = { category, value };
        if (leaves) {
          leaves.push(leaf);
        } else {
          byGroup.set(group, [leaf]);
        }
      }

      // Groups keep taxonomy order so the column reads the same in every
      // period; categories within a group lead with the largest.
      const groups = CATEGORY_GROUPS.filter((group) => byGroup.has(group)).map(
        (group) => {
          const categories = (byGroup.get(group) ?? []).toSorted(
            (a, b) => b.value - a.value
          );
          return {
            categories,
            group,
            value: categories.reduce((sum, leaf) => sum + leaf.value, 0),
          };
        }
      );

      const totalIncome = incomeNodes.reduce((s, n) => s + n.value, 0);
      const totalExpenses = groups.reduce((s, g) => s + g.value, 0);

      return {
        groups,
        incomeNodes,
        moneyLeft: Math.max(0, totalIncome - totalExpenses),
        totalExpenses,
        totalIncome,
      };
    }),

  getSpendingBreakdown: protectedProcedure
    .input(
      z.object({
        aggregation: aggregationSchema,
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const groupAmounts = await outgoingByGroup(
        context.session.user.id,
        input.aggregation,
        input.from,
        input.to
      );

      const groups = [...groupAmounts.entries()]
        .map(([group, amount]) => ({
          amount,
          group,
        }))
        .toSorted((a, b) => b.amount - a.amount);

      return { groups };
    }),

  getTransactions: protectedProcedure
    .input(
      z.object({
        categories: z.array(z.enum(SPENDING_CATEGORIES)).optional(),
        cursor: z.string().optional(),
        direction: z.enum(["incoming", "outgoing"]).optional(),
        from: z.coerce.date(),
        // Clicking a group node filters on everything it holds.
        groups: z.array(z.enum(CATEGORY_GROUPS)).optional(),
        limit: z.number().min(1).max(100).default(50),
        search: z.string().optional(),
        sort: z.enum(["date", "amount"]).default("date"),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const {
        categories,
        cursor,
        direction,
        from,
        groups,
        limit,
        search,
        sort,
        to,
      } = input;

      const dateFilter = { gte: from, lte: to };
      let directionFilter: { gt: number } | { lt: number } | undefined;
      if (direction === "incoming") {
        directionFilter = { gt: 0 };
      } else if (direction === "outgoing") {
        directionFilter = { lt: 0 };
      }

      const conditions: Prisma.TransactionWhereInput[] = [];

      if (search) {
        conditions.push({
          OR: [
            {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              counterpartyName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        });
      }

      const selected = new Set<SpendingCategory>(categories);
      for (const group of groups ?? []) {
        for (const category of categoriesInGroup(group)) {
          selected.add(category);
        }
      }

      if (selected.size > 0) {
        const wanted = [...selected];
        conditions.push({
          OR: [
            { category: { in: wanted } },
            { category: null, resolvedCategory: { in: wanted } },
          ],
        });
      }

      const baseWhere: Prisma.TransactionWhereInput = {
        account: { connection: { userId } },
        amount: directionFilter,
        date: dateFilter,
      };
      if (conditions.length > 0) {
        baseWhere.AND = conditions;
      }

      const findManyOpts: Prisma.TransactionFindManyArgs = {
        // Outgoing amounts are negative, so ascending leads with the largest
        // expense; incoming has to descend to lead with the largest credit.
        orderBy:
          sort === "amount"
            ? [
                { amount: direction === "incoming" ? "desc" : "asc" },
                { id: "desc" },
              ]
            : [{ date: "desc" }, { id: "desc" }],
        select: {
          amount: true,
          bankTransactionCode: true,
          category: true,
          counterpartyName: true,
          currency: true,
          date: true,
          description: true,
          id: true,
          merchantCategoryCode: true,
          resolvedCategory: true,
        },
        take: limit + 1,
        where: baseWhere,
      };
      if (cursor) {
        findManyOpts.cursor = { id: cursor };
        findManyOpts.skip = 1;
      }

      const transactions = await prisma.transaction.findMany(findManyOpts);

      let nextCursor: string | null = null;
      if (transactions.length > limit) {
        const last = transactions.pop();
        nextCursor = last?.id ?? null;
      }

      // Compute totals for the full filtered range (ignoring pagination)
      const incomingTotal = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...baseWhere, amount: { gt: 0 } },
      });

      const outgoingTotal = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...baseWhere, amount: { lt: 0 } },
      });

      return {
        nextCursor,
        totals: {
          incoming: incomingTotal._sum.amount ?? 0,
          outgoing: Math.abs(outgoingTotal._sum.amount ?? 0),
        },
        transactions: transactions.map((t) => ({
          amount: t.amount,
          category: effectiveCategory(t),
          counterpartyName: t.counterpartyName,
          currency: t.currency,
          date: t.date.toISOString(),
          derivedCategory: deriveCategory(t),
          description: t.description,
          id: t.id,
        })),
      };
    }),

  /**
   * Clear stale resolutions and re-run the categorisation pipeline.
   * Preserves manual overrides and internal transfer flags.
   */
  recategorise: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;

    await clearResolutions(userId);

    const categorised = await categoriseUncategorised(userId);
    return { categorised };
  }),

  /**
   * Sync raw transaction data from banking providers, then run internal
   * transfer matching and batch categorisation.
   *
   * A forced sync re-reads the provider's whole window rather than resuming at
   * the last sync, and drops the pipeline's own verdicts first: re-importing
   * re-derives every merchant key it touches, and a row already carrying a
   * category would otherwise never be re-read against it.
   */
  syncAccounts: protectedProcedure
    .input(
      z
        .object({
          connectionId: z.string().optional(),
          force: z.boolean().optional(),
        })
        .optional()
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const connectionId = input?.connectionId;
      const force = input?.force ?? false;
      const errors: string[] = [];

      const where: Prisma.BankConnectionWhereInput = {
        status: "ACTIVE",
        userId,
      };
      if (connectionId) {
        where.id = connectionId;
      }

      const connections = await prisma.bankConnection.findMany({
        include: {
          accounts: {
            select: { id: true, providerAccountId: true, type: true },
          },
        },
        where,
      });

      // Step 1: Sync raw provider data from all connections. Resolving the
      // provider or its stored identity can throw, and one connection the
      // registry no longer knows must not cost every other bank its sync.
      for (const connection of connections) {
        try {
          // eslint-disable-next-line no-await-in-loop -- sequential to avoid overwhelming the external API
          const providerUser = await findProviderUser(
            userId,
            getProvider(connection.provider)
          );
          // eslint-disable-next-line no-await-in-loop -- sequential to avoid overwhelming the external API
          await syncConnection(connection, errors, providerUser, force);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown connection error";
          errors.push(`Connection ${connection.institutionName}: ${message}`);
        }
      }

      // Step 2: Internal transfer matching (separate pass after sync)
      await matchInternalTransfers(userId);

      // Step 3: Batch categorisation of uncategorised transactions
      let categorisationWarning: string | undefined;
      let categorised = 0;
      try {
        if (force) {
          await clearResolutions(userId, input?.connectionId);
        }
        categorised = await categoriseUncategorised(userId);
      } catch (error) {
        categorisationWarning =
          error instanceof Error
            ? `Categorisation: ${error.message}`
            : "Categorisation failed";
      }

      return {
        categorised,
        error: errors.length > 0 ? errors.join("; ") : undefined,
        success: errors.length === 0,
        warning: categorisationWarning,
      };
    }),

  /**
   * Update a transaction's category. Writes to the user's MerchantOverride
   * table and propagates to sibling transactions with the same merchant key.
   */
  updateTransactionCategory: protectedProcedure
    .input(
      z.object({
        category: z.enum(SPENDING_CATEGORIES).nullable(),
        transactionId: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const tx = await prisma.transaction.findFirst({
        select: {
          amount: true,
          bankTransactionCode: true,
          category: true,
          counterpartyName: true,
          id: true,
          merchantCategoryCode: true,
          merchantKey: true,
          resolvedCategory: true,
        },
        where: {
          account: { connection: { userId } },
          id: input.transactionId,
        },
      });

      if (!tx) {
        throw new ORPCError("NOT_FOUND", {
          message: "Transaction not found",
        });
      }

      const additionalUpdated = await prisma.$transaction(async (db) => {
        // Update the target transaction
        await db.transaction.update({
          data: {
            category: input.category,
            categoryOverride: input.category !== null,
          },
          where: { id: input.transactionId },
        });

        if (!tx.merchantKey) {
          return 0;
        }

        // Write to / clear the user's MerchantOverride table
        if (input.category === null) {
          await deleteUserOverride(userId, tx.merchantKey, db);

          // Clear propagated categories for siblings
          const result = await db.transaction.updateMany({
            data: { category: null },
            where: {
              account: { connection: { userId } },
              categoryOverride: false,
              id: { not: input.transactionId },
              merchantKey: tx.merchantKey,
            },
          });
          return result.count;
        }

        await upsertUserOverride(
          userId,
          tx.merchantKey,
          input.category,
          tx.counterpartyName,
          db
        );

        // Propagate to siblings with same merchant key
        const result = await db.transaction.updateMany({
          data: { category: input.category },
          where: {
            account: { connection: { userId } },
            categoryOverride: false,
            id: { not: input.transactionId },
            merchantKey: tx.merchantKey,
          },
        });
        return result.count;
      });

      // Re-fetch for the response after the update
      const updated = await prisma.transaction.findUniqueOrThrow({
        select: {
          amount: true,
          bankTransactionCode: true,
          category: true,
          counterpartyName: true,
          merchantCategoryCode: true,
          resolvedCategory: true,
        },
        where: { id: input.transactionId },
      });

      return {
        additionalUpdated,
        category: effectiveCategory(updated),
        derivedCategory: deriveCategory(updated),
      };
    }),
};

import type { Prisma } from "@freenary/db";
import prisma from "@freenary/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { getTransactions as ebGetTransactions } from "../lib/enable-banking";
import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
  deriveCategory,
  effectiveCategory,
} from "../lib/mcc-categories";
import type { SpendingCategory } from "../lib/mcc-categories";

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

type ConnectionWithAccounts = Awaited<
  ReturnType<
    typeof prisma.bankConnection.findMany<{ include: { accounts: true } }>
  >
>[number];

const upsertTransaction = async (
  accountId: string,
  tx: Awaited<ReturnType<typeof ebGetTransactions>>["transactions"][number]
) => {
  const amountMinor = Math.round(tx.amount * 100);
  const shared = {
    amount: amountMinor,
    balanceAfterTransaction: tx.balanceAfterTransaction ?? null,
    bankTransactionCode: tx.bankTransactionCode ?? null,
    bankTransactionSubCode: tx.bankTransactionSubCode ?? null,
    counterpartyName: tx.counterpartyName ?? null,
    creditorAccountIban: tx.creditorAccountIban ?? null,
    currency: tx.currency,
    date: new Date(tx.date),
    debtorAccountIban: tx.debtorAccountIban ?? null,
    description: tx.description,
    exchangeRate: tx.exchangeRate ?? null,
    merchantCategoryCode: tx.merchantCategoryCode ?? null,
    referenceNumber: tx.referenceNumber ?? null,
    status: tx.status,
    transactionDate: tx.transactionDate ? new Date(tx.transactionDate) : null,
    valueDate: tx.valueDate ? new Date(tx.valueDate) : null,
  };

  await prisma.transaction.upsert({
    create: {
      ...shared,
      accountId,
      providerTransactionId: tx.transactionId,
    },
    update: shared,
    where: {
      accountId_providerTransactionId: {
        accountId,
        providerTransactionId: tx.transactionId,
      },
    },
  });
};

const syncConnection = async (
  connection: ConnectionWithAccounts,
  errors: string[]
) => {
  try {
    const now = new Date();
    const syncFrom =
      connection.lastSyncedAt ??
      new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const dateFrom = syncFrom.toISOString().split("T")[0] ?? "";
    const dateTo = now.toISOString().split("T")[0] ?? "";

    for (const account of connection.accounts) {
      try {
        // eslint-disable-next-line no-await-in-loop -- accounts within a connection are synced sequentially to respect API rate limits
        const { transactions } = await ebGetTransactions(
          connection.providerSessionId,
          account.providerAccountId,
          dateFrom,
          dateTo
        );

        for (const tx of transactions) {
          // eslint-disable-next-line no-await-in-loop -- transaction upserts must be sequential to avoid unique constraint race conditions
          await upsertTransaction(account.id, tx);
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Unknown account error";
        errors.push(`Account ${account.providerAccountId}: ${msg}`);
      }
    }

    await prisma.bankConnection.update({
      data: { lastSyncedAt: now },
      where: { id: connection.id },
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown connection error";
    errors.push(`Connection ${connection.institutionName}: ${msg}`);
  }
};

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

    return {
      accounts: accounts.map((a) => ({
        iban: a.iban,
        id: a.id,
        institutionName: a.connection.institutionName,
        name: a.name,
      })),
      hasAccounts: accounts.length > 0,
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

  getSankeyData: protectedProcedure
    .input(
      z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { from, to } = input;

      const transactions = await prisma.transaction.findMany({
        select: {
          amount: true,
          bankTransactionCode: true,
          category: true,
          counterpartyName: true,
          merchantCategoryCode: true,
        },
        where: {
          account: { connection: { userId } },
          date: { gte: from, lte: to },
        },
      });

      // Income side: group positive transactions by derived source label
      const incomeSources = new Map<string, number>();
      // Expense side: group negative transactions by spending category
      const expenseCategories = new Map<SpendingCategory, number>();

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

      // Build nodes: income sources → "Budget" hub → expense categories
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

      const expenseNodes = [...expenseCategories.entries()]
        .map(([category, value]) => ({
          category,
          label: CATEGORY_LABELS[category],
          value,
        }))
        .toSorted((a, b) => b.value - a.value);

      const totalIncome = incomeNodes.reduce((s, n) => s + n.value, 0);
      const totalExpenses = expenseNodes.reduce((s, n) => s + n.value, 0);

      // Links: income → budget, budget → expenses
      const incomeLinks = incomeNodes.map((n) => ({
        source: n.name,
        target: "Budget",
        value: n.value,
      }));

      const expenseLinks = expenseNodes.map((n) => ({
        source: "Budget",
        target: n.label,
        value: n.value,
      }));

      return {
        expenseLinks,
        expenseNodes,
        incomeLinks,
        incomeNodes,
        totalExpenses,
        totalIncome,
      };
    }),

  getSpendingBreakdown: protectedProcedure
    .input(
      z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { from, to } = input;

      const transactions = await prisma.transaction.findMany({
        select: {
          amount: true,
          bankTransactionCode: true,
          category: true,
          counterpartyName: true,
          merchantCategoryCode: true,
        },
        where: {
          account: { connection: { userId } },
          amount: { lt: 0 },
          date: { gte: from, lte: to },
        },
      });

      const totals = new Map<SpendingCategory, number>();
      for (const tx of transactions) {
        const category = effectiveCategory(tx);
        const abs = Math.abs(tx.amount);
        totals.set(category, (totals.get(category) ?? 0) + abs);
      }

      const categories = [...totals.entries()]
        .map(([category, amount]) => ({
          amount,
          category,
          label: CATEGORY_LABELS[category],
        }))
        .toSorted((a, b) => b.amount - a.amount);

      return { categories };
    }),

  getTransactions: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        direction: z.enum(["incoming", "outgoing"]).optional(),
        from: z.coerce.date(),
        limit: z.number().min(1).max(100).default(50),
        search: z.string().optional(),
        to: z.coerce.date(),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const { cursor, direction, from, limit, search, to } = input;

      const dateFilter = { gte: from, lte: to };
      let directionFilter: { gt: number } | { lt: number } | undefined;
      if (direction === "incoming") {
        directionFilter = { gt: 0 };
      } else if (direction === "outgoing") {
        directionFilter = { lt: 0 };
      }

      const searchFilter = search
        ? {
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
          }
        : {};

      const baseWhere: Prisma.TransactionWhereInput = {
        account: { connection: { userId } },
        amount: directionFilter,
        date: dateFilter,
        ...searchFilter,
      };

      const findManyOpts: Prisma.TransactionFindManyArgs = {
        orderBy: [{ date: "desc" }, { id: "desc" }],
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

  syncAccounts: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const errors: string[] = [];

    const connections = await prisma.bankConnection.findMany({
      include: { accounts: true },
      where: { status: "ACTIVE", userId },
    });

    for (const connection of connections) {
      // eslint-disable-next-line no-await-in-loop -- connections must be synced sequentially to avoid overwhelming the external API
      await syncConnection(connection, errors);
    }

    return {
      error: errors.length > 0 ? errors.join("; ") : undefined,
      success: errors.length === 0,
    };
  }),

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

      const updated = await prisma.transaction.update({
        data: { category: input.category },
        select: {
          amount: true,
          bankTransactionCode: true,
          category: true,
          counterpartyName: true,
          merchantCategoryCode: true,
        },
        where: { id: input.transactionId },
      });

      return {
        category: effectiveCategory(updated),
        derivedCategory: deriveCategory(updated),
      };
    }),
};

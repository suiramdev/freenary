import prisma from "@freenary/db";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { getTransactions as ebGetTransactions } from "../lib/enable-banking";

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
      const directionFilter =
        direction === "incoming"
          ? { gt: 0 }
          : (direction === "outgoing"
            ? { lt: 0 }
            : undefined);

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

      const baseWhere = {
        account: { connection: { userId } },
        date: dateFilter,
        ...(directionFilter ? { amount: directionFilter } : {}),
        ...searchFilter,
      };

      const transactions = await prisma.transaction.findMany({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        select: {
          amount: true,
          counterpartyName: true,
          currency: true,
          date: true,
          description: true,
          id: true,
        },
        take: limit + 1,
        where: baseWhere,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      });

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
          counterpartyName: t.counterpartyName,
          currency: t.currency,
          date: t.date.toISOString(),
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
      try {
        const now = new Date();
        const syncFrom =
          connection.lastSyncedAt ??
          new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const dateFrom = syncFrom.toISOString().split("T")[0]!;
        const dateTo = now.toISOString().split("T")[0]!;

        for (const account of connection.accounts) {
          try {
            const { transactions } = await ebGetTransactions(
              connection.providerSessionId,
              account.providerAccountId,
              dateFrom,
              dateTo
            );

            for (const tx of transactions) {
              // Amount from EB is a float in major units — convert to minor units (cents)
              const amountMinor = Math.round(tx.amount * 100);

              await prisma.transaction.upsert({
                create: {
                  accountId: account.id,
                  amount: amountMinor,
                  counterpartyName: tx.counterpartyName ?? null,
                  currency: tx.currency,
                  date: new Date(tx.date),
                  description: tx.description,
                  providerTransactionId: tx.transactionId,
                },
                update: {
                  amount: amountMinor,
                  counterpartyName: tx.counterpartyName ?? null,
                  currency: tx.currency,
                  date: new Date(tx.date),
                  description: tx.description,
                },
                where: {
                  accountId_providerTransactionId: {
                    accountId: account.id,
                    providerTransactionId: tx.transactionId,
                  },
                },
              });
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
    }

    return {
      error: errors.length > 0 ? errors.join("; ") : undefined,
      success: errors.length === 0,
    };
  }),
};

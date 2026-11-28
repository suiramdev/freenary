import prisma from "@freenary/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  effectiveCategory,
  pipelineCategory,
} from "../lib/transaction-category";
import { stillToCheck } from "../notifications/transactions-to-check";
import { isNotificationType, NOTIFICATION_TYPES } from "../notifications/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const READ_RETENTION_MS = 30 * DAY_MS;
const UNDO_WINDOW_MS = DAY_MS;
const MAX_LISTED = 100;
const MAX_TO_CHECK = 500;

const notificationInput = z.object({ id: z.string().min(1).max(64) });

const ownedNotification = async (userId: string, id: string) => {
  const notification = await prisma.notification.findFirst({
    select: { id: true, type: true },
    where: { id, userId },
  });
  if (!notification) {
    throw new ORPCError("NOT_FOUND", { message: "Notification not found" });
  }
  return notification;
};

const forgetExpired = (userId: string, now: Date) =>
  prisma.notification.deleteMany({
    where: {
      OR: [
        { readAt: { lt: new Date(now.getTime() - READ_RETENTION_MS) } },
        { dismissedAt: { lt: new Date(now.getTime() - UNDO_WINDOW_MS) } },
      ],
      userId,
    },
  });

const listed = async (userId: string) => {
  const rows = await prisma.notification.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      _count: {
        select: { transactions: { where: { transaction: stillToCheck } } },
      },
      connectionId: true,
      createdAt: true,
      id: true,
      readAt: true,
      type: true,
    },
    take: MAX_LISTED,
    where: { dismissedAt: null, userId },
  });
  const settled = rows.flatMap((row) =>
    row.type === NOTIFICATION_TYPES.transactionsToCheck &&
    row._count.transactions === 0
      ? [row.id]
      : []
  );
  if (settled.length > 0) {
    await prisma.notification.deleteMany({
      where: { id: { in: settled }, userId },
    });
  }
  const connectionIds = rows.flatMap((row) =>
    row.connectionId ? [row.connectionId] : []
  );
  const connections = await prisma.bankConnection.findMany({
    select: { id: true, institutionName: true },
    where: { id: { in: connectionIds }, userId },
  });
  const institutionById = new Map(
    connections.map((connection) => [connection.id, connection.institutionName])
  );
  return rows.flatMap((row) => {
    if (settled.includes(row.id) || !isNotificationType(row.type)) {
      return [];
    }
    return [
      {
        bankConnection: row.connectionId
          ? {
              id: row.connectionId,
              institutionName: institutionById.get(row.connectionId) ?? null,
            }
          : null,
        count: row._count.transactions,
        createdAt: row.createdAt.toISOString(),
        id: row.id,
        isRead: row.readAt !== null,
        type: row.type,
      },
    ];
  });
};

export const notificationsRouter = {
  clearTransactionsToCheck: protectedProcedure
    .input(notificationInput)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await ownedNotification(userId, input.id);
      await prisma.notification.deleteMany({
        where: { id: input.id, userId },
      });
      return { id: input.id };
    }),
  dismiss: protectedProcedure
    .input(notificationInput)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await ownedNotification(userId, input.id);
      await prisma.notification.updateMany({
        data: { dismissedAt: new Date() },
        where: { id: input.id, userId },
      });
      return { id: input.id };
    }),
  dismissAll: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const { count } = await prisma.notification.updateMany({
      data: { dismissedAt: new Date() },
      where: { dismissedAt: null, userId },
    });
    return { count };
  }),
  list: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    await forgetExpired(userId, new Date());
    const notifications = await listed(userId);
    const unreadCount = await prisma.notification.count({
      where: { dismissedAt: null, readAt: null, userId },
    });
    return { notifications, unreadCount };
  }),
  markAllRead: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    await prisma.notification.updateMany({
      data: { readAt: new Date() },
      where: { dismissedAt: null, readAt: null, userId },
    });
    return { ok: true };
  }),
  markRead: protectedProcedure
    .input(notificationInput)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await ownedNotification(userId, input.id);
      await prisma.notification.update({
        data: { readAt: new Date() },
        where: { id: input.id },
      });
      return { id: input.id };
    }),
  restore: protectedProcedure
    .input(notificationInput)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await ownedNotification(userId, input.id);
      await prisma.notification.updateMany({
        data: { dismissedAt: null },
        where: { id: input.id, userId },
      });
      return { id: input.id };
    }),
  transactionsToCheck: protectedProcedure
    .input(notificationInput)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const notification = await ownedNotification(userId, input.id);
      if (notification.type !== NOTIFICATION_TYPES.transactionsToCheck) {
        throw new ORPCError("BAD_REQUEST", {
          message: "This notification is not about transactions to check",
        });
      }
      const transactions = await prisma.transaction.findMany({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        select: {
          account: { select: { connection: { select: { institutionName: true } }, name: true } },
          amount: true,
          category: true,
          counterpartyName: true,
          currency: true,
          date: true,
          description: true,
          id: true,
          normalisedDescriptor: true,
          resolvedCategory: true,
        },
        take: MAX_TO_CHECK,
        where: {
          ...stillToCheck,
          account: { connection: { userId } },
          notifications: { some: { notificationId: input.id } },
        },
      });
      return transactions.map((transaction) => {
        const accountName =
          transaction.account.name ?? transaction.account.connection.institutionName;
        const category = effectiveCategory(transaction);
        const derivedCategory = pipelineCategory(transaction);
        return {
          accountName,
          amount: transaction.amount,
          category,
          currency: transaction.currency,
          date: transaction.date.toISOString(),
          derivedCategory,
          description: transaction.description,
          id: transaction.id,
          normalisedDescriptor: transaction.normalisedDescriptor,
        };
      });
    }),
};

import prisma from "@freenary/db";

import { NOTIFICATION_TYPES } from "./types";

export const notifyBankConnectionNeedsReconnect = async ({
  connectionId,
  userId,
}: {
  connectionId: string;
  userId: string;
}): Promise<string | null> => {
  const existing = await prisma.notification.findFirst({
    select: { id: true },
    where: {
      connectionId,
      dismissedAt: null,
      type: NOTIFICATION_TYPES.bankConnectionNeedsReconnect,
      userId,
    },
  });

  if (existing) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      connectionId,
      type: NOTIFICATION_TYPES.bankConnectionNeedsReconnect,
      userId,
    },
    select: { id: true },
  });

  return notification.id;
};

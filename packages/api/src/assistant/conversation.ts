import prisma from "@freenary/db";
import type { Prisma } from "@freenary/db";
import type { UIMessage } from "ai";

/**
 * A user has one active thread. Reading it creates it, so the first question
 * needs no separate "start a conversation" step.
 */
export const activeConversation = async (userId: string) => {
  const existing = await prisma.conversation.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
    where: { archivedAt: null, userId },
  });

  return (
    existing ??
    (await prisma.conversation.create({
      data: { userId },
      select: { id: true },
    }))
  );
};

/** Ordered by `ordinal`: a turn's two messages can share a `createdAt`. */
export const conversationMessages = (conversationId: string) =>
  prisma.conversationMessage.findMany({
    orderBy: { ordinal: "asc" },
    select: { id: true, parts: true, role: true },
    where: { conversationId },
  });

export const archiveActiveConversation = (userId: string) =>
  prisma.conversation.updateMany({
    data: { archivedAt: new Date() },
    where: { archivedAt: null, userId },
  });

/**
 * `UIMessage.parts` is the AI SDK's own JSON wire shape — it arrives over the
 * stream as JSON — but its part interfaces declare no index signature, which is
 * the one thing Prisma's `InputJsonValue` asks for. Mapping each part restates
 * that per element instead of widening the whole array through `unknown`.
 */
const asJson = (parts: UIMessage["parts"]): Prisma.InputJsonArray =>
  // SAFETY: every part is a plain object of JSON values; nothing in the array
  // carries a class instance, a function or a Date.
  parts.map((part) => part as Prisma.InputJsonObject);

export interface AppendTurnOptions {
  /**
   * Id the answer streamed under, so the client and the table agree on it and a
   * retry can name the turn it is redoing.
   */
  answerId: string;
  /**
   * Rows the caller verified as the turn being regenerated, deleted before the
   * new one is written: appending alone would leave the same question twice in
   * the transcript and two answers where the screen shows one. Empty for an
   * ordinary turn.
   */
  replaceMessageIds: string[];
}

/**
 * Both halves of a turn are written together, once the answer finished. The
 * conversation row is updated *first*: at READ COMMITTED two concurrent turns
 * would otherwise read the same `MAX(ordinal)` and one would lose to the unique
 * index, so the write lock that update takes is what serializes them.
 */
export const appendTurn = async (
  conversationId: string,
  userParts: UIMessage["parts"],
  assistantParts: UIMessage["parts"],
  { answerId, replaceMessageIds }: AppendTurnOptions
) => {
  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      data: { updatedAt: new Date() },
      where: { id: conversationId },
    });

    // Scoped by id, not by position: the caller verified *these* rows before
    // the answer streamed, and a turn committed from another tab meanwhile
    // would otherwise be the one deleted. Wrong ids are a no-op.
    if (replaceMessageIds.length > 0) {
      await tx.conversationMessage.deleteMany({
        where: { conversationId, id: { in: replaceMessageIds } },
      });
    }

    const last = await tx.conversationMessage.findFirst({
      orderBy: { ordinal: "desc" },
      select: { ordinal: true },
      where: { conversationId },
    });
    const next = (last?.ordinal ?? -1) + 1;

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId,
          ordinal: next,
          parts: asJson(userParts),
          role: "USER",
        },
        {
          conversationId,
          id: answerId,
          ordinal: next + 1,
          parts: asJson(assistantParts),
          role: "ASSISTANT",
        },
      ],
    });
  });
};

import { AI_CHAT_RATE_LIMIT } from "@freenary/auth/policy";
import { ORPCError } from "@orpc/server";
import type { UIMessage } from "ai";
import { z } from "zod";

import {
  activeConversation,
  appendTurn,
  archiveActiveConversation,
  conversationMessages,
} from "../assistant/conversation";
import { assistantModelId } from "../assistant/provider";
import {
  answerableParts,
  hasContent,
  MAX_QUESTION_CHARS,
  regeneratedTurnIds,
} from "../assistant/turn";
import { protectedProcedure } from "../index";
import { consumeRateLimit } from "../lib/rate-limit";

const MAX_ANSWER_CHARS = 200_000;

const questionPartsSchema = z
  .array(z.object({ text: z.string(), type: z.literal("text") }))
  .min(1);

const TOOL_STATES = [
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
  "output-available",
  "output-error",
  "output-denied",
] as const;

const answerPartSchema = z.union([
  z.looseObject({ text: z.string(), type: z.literal("text") }),
  z.looseObject({ text: z.string(), type: z.literal("reasoning") }),
  z.looseObject({ type: z.literal("step-start") }),
  z.looseObject({
    state: z.enum(TOOL_STATES),
    toolCallId: z.string(),
    type: z.string().regex(/^tool-[a-z_]+$/u),
  }),
]);

export const assistantRouter = {
  getConversation: protectedProcedure.handler(async ({ context }) => {
    const conversation = await activeConversation(context.session.user.id);
    const messages = await conversationMessages(conversation.id);

    return {
      conversationId: conversation.id,
      messages: messages.map((message) => ({
        id: message.id,
        parts: message.parts,
        role:
          message.role === "USER" ? ("user" as const) : ("assistant" as const),
      })),
      serverModel: assistantModelId(),
    };
  }),

  saveTurn: protectedProcedure
    .input(
      z.object({
        answer: z.object({
          id: z.uuid(),
          parts: z.array(answerPartSchema).min(1),
        }),
        conversationId: z.string(),
        question: questionPartsSchema,
        regeneratedMessageId: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      await consumeRateLimit(
        `ai-chat:${context.session.user.id}`,
        AI_CHAT_RATE_LIMIT
      );

      const questionChars = input.question.reduce(
        (total, part) => total + part.text.length,
        0
      );

      if (
        questionChars > MAX_QUESTION_CHARS ||
        JSON.stringify(input.answer.parts).length > MAX_ANSWER_CHARS
      ) {
        throw new ORPCError("BAD_REQUEST", { message: "Turn too large" });
      }

      const conversation = await activeConversation(context.session.user.id);

      if (conversation.id !== input.conversationId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Conversation is not the active one",
        });
      }

      /* SAFETY: each part is a plain JSON object whose `type` is a string, which is the whole of what `UIMessage["parts"]` guarantees structurally. */
      const parts = answerableParts(input.answer.parts as UIMessage["parts"]);

      if (!hasContent(parts)) {
        throw new ORPCError("BAD_REQUEST", { message: "Empty answer" });
      }

      const stored = await conversationMessages(conversation.id);

      await appendTurn(conversation.id, input.question, parts, {
        answerId: input.answer.id,
        replaceMessageIds: regeneratedTurnIds(
          stored,
          input.regeneratedMessageId
        ),
      });

      return { ok: true };
    }),

  startNewConversation: protectedProcedure.handler(async ({ context }) => {
    await archiveActiveConversation(context.session.user.id);

    return { ok: true };
  }),
};

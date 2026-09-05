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

/**
 * A browser-run answer replays to the browser model on every later turn, so a
 * turn far larger than the model's own context is either a bug or abuse.
 */
const MAX_ANSWER_CHARS = 200_000;

const questionPartsSchema = z
  .array(z.object({ text: z.string(), type: z.literal("text") }))
  .min(1);

/**
 * `UIMessage["parts"]` as `toUIMessageStream` produces them for a text-and-tools
 * answer, which is all a browser model emits: text, reasoning, step markers
 * and tool parts. Each shape is checked as far as its readers reach —
 * `hasContent` reads `text`, `convertToModelMessages` reads a tool part's id
 * and state — so a crafted part can neither crash this handler nor be stored
 * as a call that replays with no result.
 */
// Every state the SDK gives a tool part; `answerableParts` keeps only the two
// that finished.
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
  /**
   * The transcript to replay on load, plus the hosted model, if the instance
   * has one — the picker offers it beside the models that run in the browser,
   * and on an instance with none the reader has to pick one of those first.
   *
   * The id is what the interface keys its chat on, so archiving a thread and
   * refetching is all it takes to start a new one.
   */
  getConversation: protectedProcedure.handler(async ({ context }) => {
    const conversation = await activeConversation(context.session.user.id);
    const messages = await conversationMessages(conversation.id);

    return {
      conversationId: conversation.id,
      messages: messages.map((message) => ({
        id: message.id,
        // `UIMessage["parts"]` as the streaming turn wrote it.
        parts: message.parts,
        role:
          message.role === "USER" ? ("user" as const) : ("assistant" as const),
      })),
      serverModel: assistantModelId(),
    };
  }),

  /**
   * Stores a turn a browser model answered. The server route stores its own
   * turns as they finish; this is the same write for a turn whose loop ran on
   * the reader's device, where the server saw only the tool calls. A reader
   * may pick a browser model on any instance, so nothing here depends on
   * whether a model endpoint exists.
   */
  saveTurn: protectedProcedure
    .input(
      z.object({
        answer: z.object({
          id: z.uuid(),
          parts: z.array(answerPartSchema).min(1),
        }),
        conversationId: z.string(),
        question: questionPartsSchema,
        /** The assistant message a retry redid, so its turn is replaced. */
        regeneratedMessageId: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      // The model cost nothing, but the two rows a turn writes still do: the
      // same allowance the chat route gives a question bounds them here.
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

      // SAFETY: each part is a plain JSON object whose `type` is a string,
      // which is the whole of what `UIMessage["parts"]` guarantees structurally.
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

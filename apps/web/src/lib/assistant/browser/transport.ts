import { assistantSystemPrompt } from "@freenary/api/assistant/prompt";
import { assistantTools } from "@freenary/api/assistant/tools";
import {
  answerableParts,
  isoDay,
  isStorableOutcome,
  isStoredPart,
  MAX_QUESTION_CHARS,
  MAX_STEPS,
} from "@freenary/api/assistant/turn";
import { ORPCError } from "@orpc/client";
import type { ChatTransport, Tool, UIMessage, UIMessageChunk } from "ai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { ZodType } from "zod";
import { z } from "zod";

import type { client as apiClient } from "@/utils/orpc";

import { browserLanguageModel, CONTEXT_WINDOW_SIZE } from "./engine";
import { fitHistory, messageChars, promptBudgetChars } from "./history";

/**
 * What the tool signatures add to the prompt. The SDK renders each schema as
 * JSON for the model exactly as `z.toJSONSchema` does, so the estimate and the
 * prompt agree.
 */
const toolSignatureChars = (tools: Record<string, Tool>): number =>
  Object.entries(tools).reduce(
    (total, [name, tool]) =>
      total +
      name.length +
      (tool.description?.length ?? 0) +
      // SAFETY: every `assistantTools` schema is a zod v4 object; the SDK's
      // wider `FlexibleSchema` type is what hides that here.
      JSON.stringify(z.toJSONSchema(tool.inputSchema as ZodType)).length,
    0
  );

/**
 * The message the interface maps. WebLLM names an overflow in prose; the
 * reader needs to hear "start a new conversation", not "try again".
 */
const errorCode = (error: Error): string => {
  if (error instanceof ORPCError && error.code === "TOO_MANY_REQUESTS") {
    return "rate_limited";
  }
  if (/context window/iu.test(error.message)) {
    return "browser_model_context";
  }
  return error.message;
};

export interface BrowserChatTransportOptions {
  client: typeof apiClient;
  /** Read per turn: the reader can switch locale between two questions. */
  locale: () => string;
}

/** What `useChat` hands `sendMessages`; named so the class can type it. */
type SendMessagesOptions = Parameters<
  ChatTransport<UIMessage>["sendMessages"]
>[0];

/**
 * The server route's loop, run in the browser. The model is WebLLM's, the
 * tools call the same procedures through the same oRPC client the screens
 * use, and the finished turn is written through `assistant.saveTurn`, so a
 * turn answered here sits in the same transcript as one the hosted model
 * answered.
 *
 * The transcript `useChat` holds is the model's context here: there is no
 * server copy to rebuild it from without another round trip, and the server
 * stored that transcript itself.
 */
export const createBrowserChatTransport = ({
  client,
  locale,
}: BrowserChatTransportOptions): ChatTransport<UIMessage> => ({
  /** Nothing to resume: the stream never left this page. */
  reconnectToStream: () => Promise.resolve(null),

  async sendMessages({
    abortSignal,
    chatId,
    messageId,
    messages,
    trigger,
  }: SendMessagesOptions): Promise<ReadableStream<UIMessageChunk>> {
    const model = browserLanguageModel();

    if (!model) {
      throw new Error("browser_model_not_loaded");
    }

    const question = messages.at(-1);

    if (
      !question ||
      question.role !== "user" ||
      question.parts.some((part) => part.type !== "text")
    ) {
      throw new Error("bad_request");
    }

    const asked = question.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n");

    if (asked.length > MAX_QUESTION_CHARS) {
      throw new Error("bad_request");
    }

    const accounts = await client.budget.getAccounts();
    const tools = assistantTools(client);
    const instructions = assistantSystemPrompt({
      firstTransactionDate: isoDay(accounts.firstTransactionDate),
      hasAccounts: accounts.hasAccounts,
      lastTransactionDate: isoDay(accounts.lastTransactionDate),
      locale: locale(),
      today: new Date().toISOString().slice(0, 10),
    });

    // A stopped earlier turn can hold a tool call with no result; replaying it
    // would fail the request, as on the server. The oldest turns then leave
    // until the rest fits the browser model's window.
    const answerable = messages.slice(0, -1).map((message) => ({
      ...message,
      parts: answerableParts(message.parts),
    }));
    const history = fitHistory(
      answerable,
      instructions.length + toolSignatureChars(tools) + messageChars(question),
      promptBudgetChars(CONTEXT_WINDOW_SIZE)
    );
    const originalMessages = [...history, question];

    const result = streamText({
      abortSignal,
      instructions,
      messages: await convertToModelMessages(originalMessages),
      model,
      stopWhen: stepCountIs(MAX_STEPS),
      toolChoice: "auto",
      tools,
    });

    // Minted before the stream, as on the server, so the row the turn lands
    // in carries the id the reader's retry will name.
    const answerId = crypto.randomUUID();

    return result.toUIMessageStream({
      generateMessageId: () => answerId,
      onError: (thrown) =>
        errorCode(
          thrown instanceof Error ? thrown : new Error("browser_model_failed")
        ),
      onFinish: async ({ finishReason, isAborted, responseMessage }) => {
        const parts = answerableParts(responseMessage.parts).filter(
          isStoredPart
        );

        if (!isStorableOutcome({ finishReason, isAborted, parts })) {
          return;
        }

        try {
          await client.assistant.saveTurn({
            answer: { id: answerId, parts },
            conversationId: chatId,
            question: question.parts.flatMap((part) =>
              part.type === "text"
                ? [{ text: part.text, type: "text" as const }]
                : []
            ),
            regeneratedMessageId:
              trigger === "regenerate-message" ? messageId : undefined,
          });
        } catch (error) {
          throw new Error(
            errorCode(
              error instanceof Error ? error : new Error("browser_model_failed")
            ),
            { cause: error }
          );
        }
      },
      originalMessages,
    });
  },
});

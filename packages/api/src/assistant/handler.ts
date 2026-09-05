import { auth } from "@freenary/auth";
import { AI_CHAT_RATE_LIMIT } from "@freenary/auth/policy";
import { createRouterClient } from "@orpc/server";
import type { UIMessage } from "ai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import type { RequestLogger } from "evlog";
import { createAILogger } from "evlog/ai";
import { z } from "zod";

import { consumeRateLimit } from "../lib/rate-limit";
import { appRouter } from "../routers/index";
import {
  activeConversation,
  appendTurn,
  conversationMessages,
} from "./conversation";
import { assistantSystemPrompt } from "./prompt";
import { assistantModel } from "./provider";
import { assistantTools } from "./tools";
import {
  answerableParts,
  isoDay,
  isStorableOutcome,
  LOCALE,
  MAX_QUESTION_CHARS,
  MAX_STEPS,
  regeneratedTurnIds,
} from "./turn";

export interface AssistantChatOptions {
  request: Request;
  /** The Elysia wide-event logger, so model usage lands on the request's event. */
  log: RequestLogger;
}

/**
 * Exactly what the composer posts as a question, and nothing wider. A part of
 * another type would slip past `MAX_QUESTION_CHARS`, be stored verbatim and
 * replay to the model on every later turn; a `file` part with no `url` would
 * throw inside `convertToModelMessages` instead of answering 400.
 */
const questionSchema = z.looseObject({
  id: z.string().optional(),
  parts: z.array(z.object({ text: z.string(), type: z.literal("text") })),
  role: z.literal("user"),
});

const chatRequestSchema = z.object({
  // Interpolated into the system prompt, so it cannot be free text: a multiline
  // value would let a caller append their own rules to it.
  locale: z.string().regex(LOCALE).optional(),
  /**
   * With `trigger: "regenerate-message"`, the id of the assistant message being
   * redone. Streamed answers carry their stored row's id, so this names the turn
   * exactly rather than guessing from the transcript's shape.
   */
  messageId: z.string().optional(),
  /**
   * `useChat` posts the whole transcript, including assistant turns holding tool
   * and step parts. This route reads only the last message and rebuilds the rest
   * from the database, so the earlier ones are accepted unexamined.
   */
  messages: z.array(z.looseObject({ role: z.string() })).default([]),
  trigger: z.string().optional(),
});

type PostedQuestion = z.infer<typeof questionSchema>;

const postedText = (question: PostedQuestion): string =>
  question.parts.map((part) => part.text).join("\n");

export const handleAssistantChat = async ({
  log,
  request,
}: AssistantChatOptions): Promise<Response> => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return new Response("unauthorized", { status: 401 });
  }

  const model = assistantModel();

  if (!model) {
    return new Response("unconfigured", { status: 503 });
  }

  try {
    await consumeRateLimit(`ai-chat:${session.user.id}`, AI_CHAT_RATE_LIMIT);
  } catch {
    // `consumeRateLimit` throws an ORPCError, which only the oRPC handler knows
    // how to serialize; this route has to answer in HTTP itself.
    return new Response("rate_limited", { status: 429 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    // A body that is not JSON is a bad request, not a crash.
    return new Response("bad_request", { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return new Response("bad_request", { status: 400 });
  }

  const body = parsed.data;
  const regenerating = body.trigger === "regenerate-message";
  // Only the question is examined in detail; everything before it is the
  // client's own echo of a history this route reads from the database.
  const parsedQuestion = questionSchema.safeParse(body.messages.at(-1));

  if (!parsedQuestion.success) {
    return new Response("bad_request", { status: 400 });
  }

  const incoming = parsedQuestion.data;

  if (postedText(incoming).length > MAX_QUESTION_CHARS) {
    return new Response("bad_request", { status: 400 });
  }

  const api = createRouterClient(appRouter, {
    context: { auth: null, headers: request.headers, session },
  });

  const [conversation, accounts] = await Promise.all([
    activeConversation(session.user.id),
    api.budget.getAccounts(),
  ]);
  const stored = await conversationMessages(conversation.id);

  // SAFETY: `incoming` was parsed as a user message carrying only text parts,
  // which is a structurally valid `UIMessage` for the SDK.
  const question = incoming as UIMessage;

  // A regenerate re-asks a question already answered, so that turn has to leave
  // both the model's context and the table. The answer's id is what names it
  // (see `generateMessageId` below).
  const replaceMessageIds = regeneratedTurnIds(
    stored,
    regenerating ? body.messageId : undefined
  );
  const redoingLastTurn = replaceMessageIds.length > 0;

  // History comes from the database, never from the posted transcript: the
  // client can only add the question it just asked.
  const replayable = redoingLastTurn ? stored.slice(0, -2) : stored;
  // SAFETY: the stream route writes `UIMessage.parts` as produced, and the only
  // other writer, `assistant.saveTurn`, admits parts through `answerPartSchema`
  // in `routers/assistant.ts`: each a plain object whose `type` is a string,
  // which is the whole of what `UIMessage["parts"]` guarantees structurally.
  const history = replayable.map(
    (row) =>
      ({
        id: row.id,
        parts: row.parts,
        role: row.role === "USER" ? "user" : "assistant",
      }) as UIMessage
  );
  const originalMessages = [...history, question];

  const ai = createAILogger(log);

  const result = streamText({
    // The client's Stop button and a closed tab both cancel the response; without
    // the signal the SDK never reports an abort and a half-turn gets stored.
    abortSignal: request.signal,
    // `instructions`, not a system message: ai@7 refuses a system role inside
    // `messages` outright.
    instructions: assistantSystemPrompt({
      firstTransactionDate: isoDay(accounts.firstTransactionDate),
      hasAccounts: accounts.hasAccounts,
      lastTransactionDate: isoDay(accounts.lastTransactionDate),
      locale: body.locale ?? "en",
      today: new Date().toISOString().slice(0, 10),
    }),
    messages: await convertToModelMessages(originalMessages),
    model: ai.wrap(model),
    stopWhen: stepCountIs(MAX_STEPS),
    toolChoice: "auto",
    tools: assistantTools(api),
  });

  // The answer's row id is minted before it streams, so the client holds the
  // same id the table does and can name this turn if the reader retries it.
  const answerId = crypto.randomUUID();

  return result.toUIMessageStreamResponse({
    generateMessageId: () => answerId,
    onFinish: ({ finishReason, isAborted, responseMessage }) => {
      const parts = answerableParts(responseMessage.parts);

      if (!isStorableOutcome({ finishReason, isAborted, parts })) {
        return;
      }

      return appendTurn(conversation.id, question.parts, parts, {
        answerId,
        replaceMessageIds,
      });
    },
    originalMessages,
  });
};

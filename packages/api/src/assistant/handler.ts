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

/** A question longer than this is a paste, not a question. */
const MAX_QUESTION_CHARS = 8000;
/** Tool calls a single answer may chain before it has to conclude. */
const MAX_STEPS = 6;

export interface AssistantChatOptions {
  request: Request;
  /** The Elysia wide-event logger, so model usage lands on the request's event. */
  log: RequestLogger;
}

/** Two letters, optionally a region: what `getLocale()` produces. */
const LOCALE = /^[a-z]{2}(?:-[A-Z]{2})?$/u;

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

const isoDay = (date: Date | string | null): string | null => {
  if (date === null) {
    return null;
  }
  return new Date(date).toISOString().slice(0, 10);
};

/**
 * A tool call the stream never resolved cannot be replayed: `convertToModelMessages`
 * emits its `tool-call` with no matching result, which an OpenAI-compatible
 * endpoint rejects — poisoning every later turn in the conversation.
 */
const answerableParts = (parts: UIMessage["parts"]): UIMessage["parts"] =>
  parts.filter(
    (part) =>
      !part.type.startsWith("tool-") ||
      !("state" in part) ||
      part.state === "output-available" ||
      part.state === "output-error"
  );

/**
 * Whether anything a reader would see survived. A stopped stream still emits a
 * `step-start` marker, so counting parts would store a turn holding nothing —
 * and the next request would replay that emptiness to the model.
 */
const hasContent = (parts: UIMessage["parts"]): boolean =>
  parts.some(
    (part) =>
      part.type.startsWith("tool-") ||
      (part.type === "text" && part.text.trim().length > 0)
  );

/**
 * A run only failed if it ended in an error. `other` is not a failure: it is
 * what the OpenAI-compatible mapper returns for any `finish_reason` it does not
 * recognise — Together's `eos` for a finished answer lands there — so refusing
 * it would silently discard every turn on such an endpoint.
 */
const FAILED_REASONS: ReadonlySet<string> = new Set(["error"]);

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
  // both the model's context and the table. The SDK names the assistant message
  // it is redoing, and a streamed answer carries its stored row's id (see
  // `generateMessageId` below), so the anchor is exact: no guessing from the
  // transcript's shape, which drifts the moment one turn is stopped, and no
  // matching on text, which collides when the same question is asked twice.
  const trailingAnswer = stored.at(-1);
  const trailingQuestion = stored.at(-2);
  const redoingLastTurn =
    regenerating &&
    body.messageId !== undefined &&
    trailingAnswer?.id === body.messageId &&
    trailingAnswer.role === "ASSISTANT" &&
    trailingQuestion?.role === "USER";
  const replaceMessageIds = redoingLastTurn
    ? [trailingQuestion.id, trailingAnswer.id]
    : [];

  // History comes from the database, never from the posted transcript: the
  // client can only add the question it just asked.
  const replayable = redoingLastTurn ? stored.slice(0, -2) : stored;
  // SAFETY: these rows were written by this route from `UIMessage.parts`, so the
  // JSON column holds exactly that shape; nothing else writes the table.
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

      // A failed or abandoned answer must not be stored: it would be replayed
      // to the model on every later turn. `outcome.status` cannot tell — a
      // provider failure mid-answer still ends `completed`, because the
      // trailing `finish` chunk overwrites the failed outcome — so the reason
      // the run reports is the signal, and a run that reported none never
      // finished. A `length`-capped answer is kept: the reader saw that text.
      if (
        isAborted ||
        finishReason === undefined ||
        FAILED_REASONS.has(finishReason) ||
        !hasContent(parts)
      ) {
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

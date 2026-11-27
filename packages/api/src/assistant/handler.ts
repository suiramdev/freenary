import { requestSession } from "@freenary/auth";
import { AI_CHAT_RATE_LIMIT } from "@freenary/auth/policy";
import { createRouterClient, ORPCError } from "@orpc/server";
import type { UIMessage } from "ai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { Data, Effect, Match } from "effect";
import type { RequestLogger } from "evlog";
import { createAILogger } from "evlog/ai";
import { z } from "zod";

import { isJsonRequest } from "../lib/json-request";
import { consumeRateLimit } from "../lib/rate-limit";
import { appRouter } from "../routers/index";
import {
  appendTurn,
  conversationMessages,
  ownedConversation,
} from "./conversation";
import { assistantSystemPrompt, promptDashboards } from "./prompt";
import { assistantModel } from "./provider";
import { assistantTools } from "./tools";
import {
  answerableParts,
  isStorableOutcome,
  LOCALE,
  MAX_QUESTION_CHARS,
  MAX_STEPS,
  regeneratedTurnIds,
} from "./turn";

export interface AssistantChatOptions {
  request: Request;
  log: RequestLogger;
}

type ChatRefusalReason =
  | { readonly kind: "rate-limited"; readonly cause: unknown }
  | { readonly kind: "rate-limit-unavailable"; readonly cause: unknown }
  | { readonly kind: "malformed-body"; readonly cause: unknown }
  | { readonly kind: "question-too-long"; readonly chars: number };

class ChatRequestRefused extends Data.TaggedError("ChatRequestRefused")<{
  readonly reason: ChatRefusalReason;
}> {}

const questionSchema = z.looseObject({
  id: z.string().optional(),
  parts: z.array(z.object({ text: z.string(), type: z.literal("text") })),
  role: z.literal("user"),
});

const chatRequestSchema = z.object({
  dashboardId: z.string().max(64).optional(),
  id: z.string().max(64),
  locale: z.string().regex(LOCALE).optional(),
  messageId: z.string().optional(),
  messages: z.array(z.looseObject({ role: z.string() })).default([]),
  today: z.iso.date().optional(),
  trigger: z.string().optional(),
});

const REGENERATE_TRIGGER = "regenerate-message";

export const rateLimitRefusal = (cause: unknown): ChatRefusalReason =>
  cause instanceof ORPCError && cause.code === "TOO_MANY_REQUESTS"
    ? { cause, kind: "rate-limited" }
    : { cause, kind: "rate-limit-unavailable" };

export const refusalResponse = Match.type<ChatRefusalReason>().pipe(
  Match.discriminatorsExhaustive("kind")({
    "malformed-body": () => new Response("bad_request", { status: 400 }),
    "question-too-long": () =>
      new Response("question_too_long", { status: 400 }),
    "rate-limit-unavailable": () =>
      new Response("unavailable", { status: 503 }),
    "rate-limited": () => new Response("rate_limited", { status: 429 }),
  })
);

const postedText = (question: z.infer<typeof questionSchema>): string =>
  question.parts.map((part) => part.text).join("\n");

const admitChatRequest = Effect.fnUntraced(
  function* admit(request: Request, userId: string) {
    yield* Effect.tryPromise({
      catch: (cause) =>
        new ChatRequestRefused({ reason: rateLimitRefusal(cause) }),
      try: () => consumeRateLimit(`ai-chat:${userId}`, AI_CHAT_RATE_LIMIT),
    });

    const payload = yield* Effect.tryPromise({
      catch: (cause) =>
        new ChatRequestRefused({ reason: { cause, kind: "malformed-body" } }),
      try: () => request.json(),
    });

    const parsedBody = chatRequestSchema.safeParse(payload);

    if (!parsedBody.success) {
      return yield* new ChatRequestRefused({
        reason: { cause: parsedBody.error, kind: "malformed-body" },
      });
    }

    const parsedQuestion = questionSchema.safeParse(
      parsedBody.data.messages.at(-1)
    );

    if (!parsedQuestion.success) {
      return yield* new ChatRequestRefused({
        reason: { cause: parsedQuestion.error, kind: "malformed-body" },
      });
    }

    const chars = postedText(parsedQuestion.data).length;

    if (chars > MAX_QUESTION_CHARS) {
      return yield* new ChatRequestRefused({
        reason: { chars, kind: "question-too-long" },
      });
    }

    return { body: parsedBody.data, question: parsedQuestion.data };
  },
  Effect.catchTag("ChatRequestRefused", (refused) =>
    Effect.succeed(refusalResponse(refused.reason))
  )
);

export const handleAssistantChat = async ({
  log,
  request,
}: AssistantChatOptions): Promise<Response> => {
  if (!isJsonRequest(request)) {
    return new Response("unsupported_media_type", { status: 415 });
  }

  const session = await requestSession(request.headers);

  if (!session?.user) {
    return new Response("unauthorized", { status: 401 });
  }

  const model = assistantModel();

  if (!model) {
    return new Response("unconfigured", { status: 503 });
  }

  const admitted = await Effect.runPromise(
    admitChatRequest(request, session.user.id)
  );

  if (admitted instanceof Response) {
    return admitted;
  }

  const { body, question: postedQuestion } = admitted;

  const api = createRouterClient(appRouter, {
    context: { auth: null, headers: request.headers, session },
  });

  const [conversation, accounts, dashboards] = await Promise.all([
    ownedConversation(session.user.id, body.id),
    api.budget.getAccounts(),
    promptDashboards(api, body.dashboardId),
  ]);

  if (!conversation) {
    return new Response("not_found", { status: 404 });
  }

  const stored = await conversationMessages(conversation.id);

  /* SAFETY: `postedQuestion` was parsed as a user message carrying only text
     parts, which is a structurally valid `UIMessage` for the SDK. */
  const question = postedQuestion as UIMessage;
  const replaceMessageIds = regeneratedTurnIds(
    stored,
    body.trigger === REGENERATE_TRIGGER ? body.messageId : undefined
  );

  const replayableHistory =
    replaceMessageIds.length > 0 ? stored.slice(0, -2) : stored;

  /* SAFETY: the stream route writes `UIMessage.parts` as produced, and the only
     other writer, `assistant.saveTurn`, admits parts through `answerPartSchema`
     in `routers/assistant.ts`: each a plain object whose `type` is a string,
     which is the whole of what `UIMessage["parts"]` guarantees structurally. */
  const history = replayableHistory.map(
    (row) =>
      ({
        id: row.id,
        parts: row.parts,
        role: row.role === "USER" ? "user" : "assistant",
      }) as UIMessage
  );

  const originalMessages = [...history, question];
  const boundedMessages = boundHistoryForModel(originalMessages);

  const ai = createAILogger(log);

  const stream = streamText({
    abortSignal: request.signal,
    instructions: assistantSystemPrompt(
      accounts,
      body.locale ?? "en",
      body.today ?? new Date().toISOString().slice(0, 10),
      dashboards
    ),
    messages: await convertToModelMessages(boundedMessages),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    model: ai.wrap(model),
    stopWhen: stepCountIs(MAX_STEPS),
    toolChoice: "auto",
    tools: assistantTools(api, { conversationId: conversation.id }),
  });

  const answerId = crypto.randomUUID();

  return stream.toUIMessageStreamResponse({
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

export const MAX_HISTORY_TURNS = 10;
export const MAX_TOOL_OUTPUT_CHARS = 2000;
export const MAX_CONTEXT_CHARS = 60000;
export const MAX_OUTPUT_TOKENS = 4096;

type ContextPart = UIMessage["parts"][number];

const partChars = (part: ContextPart): number => {
  if ("text" in part && typeof part.text === "string") {
    return part.text.length;
  }
  if ("output" in part && typeof part.output === "string") {
    return part.output.length;
  }
  if ("output" in part && part.output !== undefined) {
    return JSON.stringify(part.output)?.length ?? 0;
  }
  return 0;
};

const pruneToolOutput = (part: ContextPart): ContextPart => {
  if (!("output" in part) || part.output === undefined) {
    return part;
  }
  if (typeof part.output === "string") {
    return part.output.length <= MAX_TOOL_OUTPUT_CHARS
      ? part
      : ({
          ...part,
          output: part.output.slice(0, MAX_TOOL_OUTPUT_CHARS),
        }) as ContextPart;
  }
  const serialized = JSON.stringify(part.output);
  return serialized === undefined || serialized.length <= MAX_TOOL_OUTPUT_CHARS
    ? part
    : ({ ...part, output: serialized.slice(0, MAX_TOOL_OUTPUT_CHARS) }) as ContextPart;
};

export const boundHistoryForModel = (
  messages: readonly UIMessage[],
): UIMessage[] => {
  const windowed: UIMessage[] = messages
    .slice(-MAX_HISTORY_TURNS * 2)
    .map((message) => ({
      ...message,
      parts: message.parts.map(pruneToolOutput),
    }));
  const bounded: UIMessage[] = [];
  let chars = 0;
  for (const message of [...windowed].reverse()) {
    const messageChars = message.parts.reduce(
      (sum, part) => sum + partChars(part),
      0,
    );
    if (bounded.length > 0 && chars + messageChars > MAX_CONTEXT_CHARS) {
      break;
    }
    bounded.unshift(message);
    chars += messageChars;
  }
  return bounded;
};

import type { ServerSettings } from "@freenary/instance-config/candidate";
import type { ProbeFailureReason } from "@freenary/instance-config/probe";
import {
  IntegrationProbeFailed,
  probeDeadline,
} from "@freenary/instance-config/probe";
import { Effect, Schema } from "effect";

import {
  endpointHeaders,
  isTimeout,
  timeoutDetail,
} from "../categorisation/classifier/endpoint";

const TRAILING_SLASHES = /\/+$/u;

const PROBE_PROMPT = "Reply with the single word OK.";

const PROBE_ANSWER_TOKEN_BUDGET = 2;

const ChatCompletionSchema = Schema.Struct({
  choices: Schema.NonEmptyArray(Schema.Unknown),
});

const failure = (reason: ProbeFailureReason): IntegrationProbeFailed =>
  new IntegrationProbeFailed({
    integrationId: "assistant",
    reason,
    variantId: "openai-compatible",
  });

const unreachable = (cause: unknown): IntegrationProbeFailed =>
  failure({ detail: String(cause), kind: "unreachable" });

export const probeAssistantEndpoint = Effect.fn("assistant.probe")(
  function* probeAssistantEndpoint(
    candidate: ServerSettings,
    send: typeof fetch = fetch
  ) {
    const { AI_API_KEY, AI_BASE_URL, AI_MODEL, AI_TIMEOUT_MS } = candidate;

    if (AI_BASE_URL === undefined) {
      return yield* failure({ detail: "AI_BASE_URL", kind: "invalid" });
    }

    if (AI_MODEL === undefined) {
      return yield* failure({ detail: "AI_MODEL", kind: "invalid" });
    }

    const response = yield* Effect.tryPromise({
      catch: (cause) =>
        isTimeout(cause)
        ? failure({
          detail: timeoutDetail(cause, AI_TIMEOUT_MS, "AI_TIMEOUT_MS"),
          kind: "timeout",
        })
        : unreachable(cause),
      try: (signal) =>
        send(`${AI_BASE_URL.replace(TRAILING_SLASHES, "")}/chat/completions`, {
          body: JSON.stringify({
            max_tokens: PROBE_ANSWER_TOKEN_BUDGET,
            messages: [{ content: PROBE_PROMPT, role: "user" }],
            model: AI_MODEL,
          }),
          headers: endpointHeaders(AI_API_KEY),
          method: "POST",
          signal: probeDeadline(signal, AI_TIMEOUT_MS),
        }),
    });

    if (!response.ok) {
      const body = yield* Effect.tryPromise({
        catch: unreachable,
        try: () => response.text(),
      });

      return yield* failure({
        detail: body,
        kind: "rejected",
        status: response.status,
      });
    }

    const payload = yield* Effect.tryPromise({
      catch: (cause) => failure({ detail: String(cause), kind: "invalid" }),
      try: () => response.json(),
    });

    yield* Schema.decodeUnknownEffect(ChatCompletionSchema)(payload).pipe(
      Effect.mapError((cause: Schema.SchemaError) =>
        failure({ detail: cause.message, kind: "invalid" })
      )
    );
  }
);

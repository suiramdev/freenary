import { describe, expect, it } from "bun:test";

import { settings } from "@freenary/instance-config";
import type { ServerSettings } from "@freenary/instance-config/candidate";
import { Effect, Result } from "effect";

import { probeAssistantEndpoint } from "./probe";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type JsonBody = Readonly<Record<string, JsonValue>>;

const candidate: ServerSettings = {
  ...settings,
  AI_API_KEY: "sk-test",
  AI_BASE_URL: "https://openrouter.ai/api/v1/",
  AI_MODEL: "qwen/qwen3-8b",
};

const answering = (status: number, body: JsonBody) => {
  const requested: string[] = [];
  const requests: RequestInit[] = [];

  const send: typeof fetch = Object.assign(
    (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      requested.push(String(input));
      requests.push(init ?? {});

      return Promise.resolve(Response.json(body, { status }));
    },
    { preconnect: fetch.preconnect }
  );

  return { requested, requests, send };
};

const delayed = (status: number, body: JsonBody, delayMs: number) => {
  const send: typeof fetch = Object.assign(
    () => new Promise<Response>((resolve) => {
      setTimeout(() => resolve(Response.json(body, { status })), delayMs);
    }),
    { preconnect: fetch.preconnect },
    );

  return { send };
};

const silent = () => {
  const send: typeof fetch = Object.assign(
    (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(init?.signal?.reason);
        });
      }),
    { preconnect: fetch.preconnect },
    );

  return { send };
};

const probe = (send: typeof fetch, held = candidate) =>
  Effect.runPromise(Effect.result(probeAssistantEndpoint(held, send)));

describe("probeAssistantEndpoint", () => {
  it("posts one chat completion to the endpoint's own path", async () => {
    const endpoint = answering(200, {
      choices: [{ message: { content: "OK", role: "assistant" } }],
    });

    const outcome = await probe(endpoint.send);

    expect(Result.isSuccess(outcome)).toBe(true);
    expect(endpoint.requested).toEqual([
      "https://openrouter.ai/api/v1/chat/completions",
    ]);
  });

  it("reports the status of a refused key", async () => {
    const outcome = await probe(
      answering(401, { error: { message: "No auth" } }).send
    );

    expect(outcome).toMatchObject({
      failure: {
        integrationId: "assistant",
        reason: { kind: "rejected", status: 401 },
      },
    });
  });

  it("reports an answer with no choice as invalid", async () => {
    const outcome = await probe(answering(200, { choices: [] }).send);

    expect(outcome).toMatchObject({
      failure: { reason: { kind: "invalid" } },
    });
  });

  it("names the base URL when it is the value that is missing", async () => {
    const outcome = await probe(answering(200, {}).send, {
      ...candidate,
      AI_BASE_URL: undefined,
    });

    expect(outcome).toMatchObject({
      failure: { reason: { detail: "AI_BASE_URL", kind: "invalid" } },
    });
  });

  it("refuses to probe an endpoint with no model", async () => {
    const outcome = await probe(answering(200, {}).send, {
      ...candidate,
      AI_MODEL: undefined,
    });

    expect(outcome).toMatchObject({
      failure: { reason: { kind: "invalid" } },
    });
  });

    it("reports a timed-out probe as a timeout, not as unreachable", async () => {
      const outcome = await probe(
        () =>
          Promise.reject(
            new DOMException("The operation timed out.", "TimeoutError"),
            ),
        { ...candidate, AI_TIMEOUT_MS: 30_000 },
        );

          expect(outcome).toMatchObject({
            failure: {
              integrationId: "assistant",
              reason: {
                detail: "no answer within 30 s. Raise AI_TIMEOUT_MS to wait longer.",
                kind: "timeout",
              },
            },
          });
    });

    it("waits past ten seconds for a slow local model", async () => {
      const endpoint = delayed(
        200,
        { choices: [{ message: { content: "OK", role: "assistant" } }] },
        10_500,
        );

          const outcome = await probe(endpoint.send, {
            { ...candidate, AI_TIMEOUT_MS: 60_000 },
                                      );

          expect(Result.isSuccess(outcome)).toBe(true);
    }, 20_000);

    it("reports an endpoint that never answers as a timeout", async () => {
      const outcome = await probe(silent().send, {
        { ...candidate, AI_TIMEOUT_MS: 50 },
                                  });

      expect(outcome).toMatchObject({
        failure: {
          integrationId: "assistant",
          reason: {
            detail:
              "no answer within 0.05 s. Raise AI_TIMEOUT_MS to wait longer.",
            kind: "timeout",
          },
        },
      });
});

  it("asks for the shortest possible answer", async () => {
    const endpoint = answering(200, {
      choices: [{ message: { content: "OK", role: "assistant" } }],
    });

        const outcome = await probe(endpoint.send);

        expect(Result.isSuccess(outcome)).toBe(true);
    expect(endpoint.requests).toHaveLength(1);
    expect(JSON.parse(String(endpoint.requests[0]?.body))).toMatchObject({
      max_tokens: 2,
    });
  });
  });

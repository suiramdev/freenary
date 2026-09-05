# ADR-007: The Assistant Streams Outside oRPC And Reads Through It

## Status

Accepted. Makes the AI area real: `CONTEXT.md` lists it as one of the seven areas and `apps/fumadocs/content/docs/ai.mdx` described it as behaviour, while the route rendered a placeholder.

## Context

The assistant needs four things the existing surfaces do not give it together:

- **Token streaming.** `packages/api` is oRPC, and every procedure is unary: a `protectedProcedure` cannot hand back a stream of tokens as they arrive. oRPC 1.14 does support event iterators, but the web client is a plain `RPCLink` and nothing in the repo has ever used them.
- **The same numbers as the charts.** "How much did I spend on groceries?" has to agree with `/budget` for the same period. `packages/api/src/routers/budget.ts` holds that arithmetic — the monthly aggregation modes, the recurring-expense detector, the `WHERE` clause every expense view shares — in module-private helpers.
- **A session.** The chat is per-user data. The web app and the API are on different origins, so a TanStack Start server route in `apps/web` (what `apps/fumadocs` does for its docs chat) cannot read the session cookie at all.
- **A provider that a self-hoster actually has.** `apps/fumadocs` reads `process.env.OPENROUTER_API_KEY` raw, which `apps/server/AGENTS.md` forbids and which pins every deployment to one gateway.

## Decision

### 1. The stream is a raw Elysia route; everything else stays oRPC

`POST /ai/chat` is mounted in `apps/server/src/index.ts` with `{ parse: "none" }`, beside `/rpc*` — the arrangement `apps/server/AGENTS.md` sanctions for a non-oRPC surface. It sits after `evlog()` and `.derive(identifyUser)`, so it inherits the request's wide event and the identified user for free.

Everything that is not a token stream remains a procedure. `assistant.getConversation` returns the transcript to replay plus whether a model is configured at all; `assistant.startNewConversation` archives the active thread. Both are `protectedProcedure`, both are typed end to end, and the interface reaches them through the ordinary oRPC client.

The route resolves the session exactly as `packages/api/src/context.ts` does — `auth.api.getSession({ headers })` — and answers `401`, `503` (no model configured), `429` (rate limited) or `400` (malformed turn) with a bare machine code as the body. `consumeRateLimit` throws an `ORPCError`, which only the oRPC handler knows how to serialize, so the route catches it and writes the status itself.

### 2. Tools call the procedures, they do not re-query

`packages/api/src/assistant/tools.ts` builds its seven read-only tools over a server-side router client — `createRouterClient(appRouter, { context })` — rather than over Prisma. Nothing in `budget.ts` moved, and nothing was reimplemented: a tool is a description, a Zod input schema and one procedure call.

That is the whole point. A second implementation of "outgoing transactions in a period" would agree with the charts on the day it was written and drift afterwards; going through `protectedProcedure` also means the session guard cannot be forgotten in a tool.

The tools cap what the procedures allow where a model would otherwise be wasteful: `search_transactions` takes at most 20 rows against the procedure's 100, because a hundred raw bank descriptors per turn crowd out the conversation. Category slugs travel as `z.enum(SPENDING_CATEGORIES)` / `z.enum(CATEGORY_GROUPS)`, so a model cannot invent one.

### 3. History is server-authoritative

`useChat` posts the whole transcript on every turn. The route ignores all of it but the last message, which must be a `user` turn under 8000 characters, and rebuilds context from `conversation_message` rows. A client cannot put words in the assistant's mouth to steer the next answer, and a turn is stored only once the answer finished — an abandoned stream leaves no half-turn behind.

One active thread per user, `archivedAt` marking the ones the user moved on from. `ordinal` orders a conversation rather than `createdAt`: both messages of a turn are written in one transaction and can share a millisecond.

### 4. Any OpenAI-compatible endpoint, and nothing by default

`AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` in `packages/env/src/server.ts`, all optional, driving `@ai-sdk/openai-compatible`. One code path reaches OpenRouter, OpenAI, Groq, vLLM, Ollama and LM Studio; the operator picks the model string. The key is optional because a local runtime has none.

There is deliberately no default endpoint or model. `isAssistantConfigured()` is false without a URL and a model, and Home then says so instead of offering a composer that fails at the provider — the same rule `BANKING_PROVIDER` follows.

## Consequences

- The assistant is the Home area's content, and the AI navigation entry is gone. `CONTEXT.md`'s seven areas still hold; "What does all of this mean?" is now answered where "Where am I right now?" is asked, which is also where a dashboard will later sit beside it.
- A new capability is a new tool, not a new endpoint. It needs a procedure to call, which keeps the interface and the assistant reading the same code.
- Token counts and per-tool timings reach the request's wide event through `evlog/ai` (`ai.wrap(model)`), but the Elysia event closes when the handler returns its `Response`, before the body finishes streaming. Anything measured after the last token is not on that event.
- Answers cost money per question, so `AI_CHAT_RATE_LIMIT` (30 per 5 minutes) is keyed on the user id rather than `callerBucket`: a household behind one NAT would otherwise share a budget.
- Model prose is the one place category slugs become words without a message key. The API still returns slugs — the system prompt is what tells the model to name them in the reader's language.
- Charts composed by the model arrived with ADR-008, inside the text part as fenced OpenUI Lang. Proactive insights and an in-browser local tier are still absent. The local tier in particular waits on function calling in WebLLM, which is still marked work-in-progress upstream; shipping it as a silently weaker tool loop would be worse than not shipping it.

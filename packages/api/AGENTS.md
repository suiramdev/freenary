# `packages/api` — API Layer

Typed RPC procedures consumed by `apps/web` (via `@orpc/tanstack-query`) and mounted by `apps/server` (via `RPCHandler` and `OpenAPIHandler`).

## Stack

- **oRPC** (`@orpc/server`) — typed procedure builder with middleware support.
- **Zod 4** — input/output validation.
- **Better Auth** — session resolution via `createContext`.

## Layout

```
src/
  index.ts          # Procedure builder: publicProcedure, protectedProcedure
  context.ts        # createContext: resolves session from Elysia request headers
  routers/
    index.ts        # appRouter: all procedure definitions, exported type
```

## Conventions

- Every procedure is defined in `src/routers/` and composed into `appRouter`.
- Use `publicProcedure` for unauthenticated endpoints, `protectedProcedure` for session-guarded ones. `protectedProcedure` throws `UNAUTHORIZED` if no session.
- Input validation uses Zod schemas. Output types are inferred — avoid manual typing.
- `apps/web` imports the **router type** (`AppRouter`, `AppRouterClient`) for full client inference — never the implementation.
- The context depends on Elysia's `Context` type. If the server framework changes, `context.ts` is the only file that needs updating.
- **Return slugs and enums, never display strings.** `apps/web` is translated and the API is not: a human-readable `label` in a response is English the client cannot translate and must ignore. Send the stable key (`"daily-living"`, `"ACTIVE"`) and let the web app map it to a message — the spending taxonomy works this way via `apps/web/src/lib/taxonomy-labels.ts`. Text that originates with the user, the bank or the provider is data, not UI copy, and passes through as-is.
- **Bank providers live in `src/providers/<id>/` behind `BankingProvider`** (`src/providers/types.ts`); routers and sync only ever see that interface, and `src/providers/registry.ts` picks the default from `BANKING_PROVIDER`. Per-user provider identities are persisted by `src/lib/bank-provider-user.ts`, never by an adapter.
- **Categorisation needs `bun run build:data` before the dev stack.** `data/merchants.jsonl.gz` is gitignored and only the production `apps/server/Dockerfile` builds it; `.docker/dockerfile.dev` does not. Without it the dictionary stage is a permanent no-op — every well-known merchant falls through to the keyword tables in `src/categorisation/keywords/`, so a handful resolve and the rest read as uncategorised, logged once as `[categorisation] Dictionary file not found`. Run it on the host: the repo dir is what `COPY . .` and the compose watch sync carry into the container.
- **The assistant is the one non-oRPC surface, and it still reads through oRPC.** `src/assistant/` holds the model client (`provider.ts`), the system prompt, the conversation store and `handler.ts` — a `Request`-to-`Response` function that `apps/server` mounts at `POST /ai/chat`, because token streaming does not fit a unary procedure. Its tools do **not** query Prisma: `tools.ts` calls the very procedures the interface calls through `createRouterClient(appRouter, { context })`, so an answer and a chart cannot drift, and `protectedProcedure` still guards every read. A new capability is a new tool over an existing procedure. See `docs/adr/007-assistant-streaming-boundary.md`.

## Adding a procedure

1. Define the procedure in `src/routers/index.ts` (or a new file under `src/routers/` re-exported from the index).
2. Choose `publicProcedure` or `protectedProcedure`.
3. Chain `.input(schema)` for validation, then `.handler(...)`.
4. The server and web client pick it up automatically — no wiring needed.

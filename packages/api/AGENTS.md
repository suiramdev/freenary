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

## Adding a procedure

1. Define the procedure in `src/routers/index.ts` (or a new file under `src/routers/` re-exported from the index).
2. Choose `publicProcedure` or `protectedProcedure`.
3. Chain `.input(schema)` for validation, then `.handler(...)`.
4. The server and web client pick it up automatically — no wiring needed.

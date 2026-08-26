# `apps/server`

## Stack

- **Elysia** HTTP framework on **Bun** (`bun run --hot src/index.ts`, port 3000).
- **oRPC** — typed RPC handler at `/rpc*`, OpenAPI reference at `/api-reference*`.
- **Better Auth** — session/auth handler at `/api/auth/*`, configured in `packages/auth`.
- **evlog** — structured logging via Elysia plugin; file-system drain in dev.
- **tsdown** for production builds (`bun run build`).

## Layout

```
src/
  index.ts        # Elysia app: CORS, auth, RPC, OpenAPI, health check
```

The server is thin glue — business logic lives in `packages/api`, auth in
`packages/auth`, database in `packages/db`. This app wires them together and
exposes HTTP endpoints.

## Conventions

- All API procedures belong in `packages/api/src/routers/`, not here. This app mounts
  the router — it does not define procedures.
- Environment variables are validated in `@freenary/env/server` via `createEnv`. Add
  new server-side vars there, not in this app.
- The `.env` file in this directory provides development defaults. Docker Compose
  overrides them for container networking.
- CORS is restricted to `env.CORS_ORIGIN`; credentials are enabled.

## Adding a new HTTP surface

1. Define an oRPC procedure in `packages/api/src/routers/`.
2. The existing RPC handler in `src/index.ts` picks it up automatically.
3. For non-oRPC endpoints (webhooks, static files), add an Elysia route in `src/index.ts`.

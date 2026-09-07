# `packages/env` — Environment Variables

Type-safe environment variable validation using `@t3-oss/env-core` + Zod.

## Layout

```
src/
  server.ts         # Server-side env: DATABASE_URL, BETTER_AUTH_SECRET, etc.
  web.ts            # Client-side env: VITE_SERVER_URL (VITE_ prefix required)
```

## Conventions

- **Server vars** go in `src/server.ts` under the `server` key. They are validated at startup and available via `import { env } from "@freenary/env/server"`.
- **Client vars** go in `src/web.ts` under the `client` key with `clientPrefix: "VITE_"`. Available via `import { env } from "@freenary/env/web"`.
- Every env var must have a Zod schema. Use `.min(1)` for required strings, `.url()` for URLs, `.default(...)` for optional values.
- `skipValidation` is controlled by `SKIP_ENV_VALIDATION` — useful for build steps that don't need runtime env.
- When adding a new variable: add the Zod schema here, document it in the root `.env.example`, and add it to the `x-app-env` anchor in `docker-compose.dev.yml` so the dev stack passes it through. The production `docker-compose.yml` gives the server every line of the root `.env` through `env_file`, so it needs no edit unless the value affects container networking.
- `PUBLIC_SERVER_URL` and `SERVER_URL` are the exception: `apps/web/src/lib/server-url.ts` reads them raw from `process.env` at request time, outside any schema here.

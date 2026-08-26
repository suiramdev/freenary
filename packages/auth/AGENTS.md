# `packages/auth` — Authentication

Better Auth configuration shared between server and web.

## Stack

- **Better Auth** — email/password authentication, session management.
- **Prisma adapter** — sessions and accounts stored in the shared PostgreSQL database.

## Layout

```
src/
  index.ts          # createAuth() + singleton export
```

## Conventions

- `createAuth()` is the single source of truth for auth configuration. Both `apps/server` (handler) and `packages/api` (session resolution) consume it.
- The Prisma adapter uses `@freenary/db`'s `createPrismaClient`. Auth tables (`User`, `Session`, `Account`, `Verification`) are defined in `packages/db/prisma/schema/auth.prisma`.
- Environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`) come from `@freenary/env/server`. Add new auth-related vars there.
- Plugins are added to the `plugins` array in `createAuth()`. Keep the list minimal.
- Cookie defaults are `sameSite: "none"`, `secure: true`, `httpOnly: true` — suitable for cross-origin dev; review before production with same-origin setup.

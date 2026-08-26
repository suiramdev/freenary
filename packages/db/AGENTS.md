# `packages/db` — Data Layer

The database package. PostgreSQL via Prisma with the `@prisma/adapter-pg` driver adapter.

## Layout

```
prisma/
  schema/
    schema.prisma     # Generator + datasource config
    auth.prisma       # Auth models (User, Session, Account, Verification)
  migrations/         # Versioned migration files
  generated/          # Prisma Client output (gitignored internals)
prisma.config.ts      # Prisma config: schema path, migration path, datasource URL
src/
  index.ts            # createPrismaClient() + default singleton
```

## Schema

Prisma uses **multi-file schema** — `.prisma` files live in `prisma/schema/`. The generator outputs to `prisma/generated/` with ESM module format and Bun runtime.

Auth models are managed by Better Auth and defined in `auth.prisma`. Domain models for the financial data layer will be added as separate `.prisma` files alongside it.

## Migrations (strict)

Schema changes ship as **versioned migration files** and are applied with `db:migrate`.

**Every schema edit follows this loop:**

1. Edit the schema under `prisma/schema/`.
2. Generate the migration:
   ```bash
   bun run db:migrate    # from repo root — runs prisma migrate dev
   ```
3. Review the generated SQL before trusting it.
4. Regenerate the client:
   ```bash
   bun run db:generate   # from repo root — runs prisma generate
   ```
5. Commit the schema change **and** its generated migration together.

**Rules — non-negotiable:**

- **Never hand-edit or hand-rename a migration once it has shipped** (merged, or applied anywhere). Fix forward with a new migration.
- **A schema edit and its migration land in the same commit/PR** — never one without the other.
- `db:push` is for fast iteration on a throwaway local database only. Before committing, capture the change as a migration.

## Scripts

| Script              | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `db:push`           | Push schema directly (no migration history)         |
| `db:generate`       | Generate Prisma Client types                        |
| `db:migrate`        | Create and apply a migration (`prisma migrate dev`) |
| `db:migrate:deploy` | Apply pending migrations (production)               |
| `db:studio`         | Open Prisma Studio UI                               |

## Conventions

- The `prisma.config.ts` reads `DATABASE_URL` from `apps/server/.env` via dotenv.
- `createPrismaClient()` is the factory; the default export is a singleton for convenience. Prefer the factory when you need a fresh connection (e.g. in tests).
- Table names are lowercase singular (`@@map("user")`, `@@map("session")`).

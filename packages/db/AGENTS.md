# `packages/db` — Data Layer

The multi-tenant data layer. Two schema sets over two physical database tiers:

- **Control plane** (`src/schema`) — one global database: identity/sessions, the
  organization registry, the authoritative audit log. Reached through the `controlPlaneDb`
  singleton in `src/index.ts`.
- **Organization** (`src/organization-schema`) — each organization's own database:
  per-organization application data. Reached at runtime through `getOrganizationDb`
  (`src/organization-db.ts`), never a global singleton.

Each tier has its own drizzle config and migration folder:

| Tier          | Schema                    | Config                           | Migrations                    |
| ------------- | ------------------------- | -------------------------------- | ----------------------------- |
| Control plane | `src/schema`              | `drizzle.config.ts`              | `src/migrations`              |
| Organization  | `src/organization-schema` | `drizzle.organization.config.ts` | `src/organization-migrations` |

## Migrations (strict)

Schema changes ship as **versioned migration files** and are applied with `db:migrate`.
That is the only supported mechanism: dev bootstrap and runtime organization provisioning
both migrate, so every database carries a recorded history. `db:push` is opt-in dev tooling
(see below), never the way schema reaches a shared database.

**Every schema edit follows this loop:**

1. Edit the schema under `src/schema` and/or `src/organization-schema`.
2. Generate the migration **through the CLI, with a descriptive `--name`** — one per tier
   you touched (run from `packages/db`):
   ```bash
   bun run db:generate:main --name <descriptive_name>          # control-plane schema
   bun run db:generate:organization --name <descriptive_name>  # organization schema
   ```
3. Review the generated SQL — drizzle-kit can emit destructive statements; read the diff
   before trusting it.
4. Apply with `bun run db:migrate` from the repo root (`:main` / `:organization` to scope).
5. Commit the schema change **and** its generated migration (SQL + `meta/`) together.

**Rules — non-negotiable:**

- **Always pass `--name <descriptive_snake_case>`.** Never accept drizzle-kit's random slug
  (e.g. `0000_bored_namora`). Name the change for what it does — `0001_add_mission_reviews`,
  `0002_drop_legacy_token`. The baseline migration is `0000_init`.
- **Never hand-write, hand-edit, or hand-rename a migration.** Regenerate through the CLI so
  the SQL and the `meta/` snapshots stay in lockstep.
- **Never edit or delete a migration once it has shipped** (merged, or applied anywhere). Fix
  forward with a new named migration.
- **Keep both tiers in sync** when changing shared enums (`src/schema/shared-enums.ts`, which
  the organization schema re-exports): regenerate both migration folders.
- **A schema edit and its migration land in the same commit/PR** — never one without the other.

## `db:push` is opt-in

`db:push` diffs the schema straight onto a database with no version history and would drift a
migrated database. It is not the setup mechanism, and its CLI is gated behind an explicit
opt-in:

```bash
FREENARY_DB_PUSH=1 bun run db:push   # scratch/local database only
```

Use it only for fast iteration on a throwaway local database; before committing, capture the
change as a named migration per the loop above.

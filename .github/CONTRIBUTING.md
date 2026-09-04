# Contributing to Freenary

Thanks for contributing to Freenary.

## Before You Start

- Read [`CONTEXT.md`](../CONTEXT.md) — Freenary is an open-source personal finance and wealth-management platform. Keep changes aligned with that vision.
- Read the [Development](../apps/fumadocs/content/docs/development/index.mdx) section of the documentation for the full workflow.
- Keep changes scoped to a clear user-facing improvement, bug fix, or refactor.
- Follow the code standards in [`AGENTS.md`](../AGENTS.md) — the repo uses Ultracite (Oxlint + Oxfmt) with strict, auto-fixable rules.

## Local Setup

Containerised stack (needs [OrbStack](https://orbstack.dev), applies the migrations for you):

```bash
bun install
bun run dev:up            # PostgreSQL, migrations, API server, web app, docs site
```

Local stack, without OrbStack:

```bash
bun install
bun run db:start          # starts the Postgres container
bun run db:push           # applies the Prisma schema
bun run dev               # web on 3001, server on 3000, docs on 4000
```

There is no seed script. Create an account through the sign-in screen; with no email provider configured, sign-up returns a session immediately. See [Local development stack](../apps/fumadocs/content/docs/development/local-stack.mdx) for the details, and [Configuration reference](../apps/fumadocs/content/docs/self-hosting/configuration.mdx) for every environment variable.

## Branch Naming

Use a clear, descriptive branch name that reflects the change.

Good examples:

- `fix/login-redirect-loop`
- `feat/portfolio-holdings-view`
- `chore/update-contributor-guide`

Avoid vague names like `test`, `misc`, or `changes`.

## Before Opening a PR

Run the same checks that CI runs, in this order:

```bash
bun run check         # Oxlint + Oxfmt
bun run check-types   # TypeScript
bun run build         # every app
```

Most lint/format issues are auto-fixable with `bun run fix`.

CI runs no tests, and there is no root `test` script. Run the test files your change touches by hand with `bun test <path>`.

If your change affects UI, verify it in the browser, including light and dark mode.

If your change alters documented behavior — a screen, an API route, an environment variable, a `packages/db` enum, a script, or a provider integration — update [`apps/fumadocs`](../apps/fumadocs) in the same pull request. Pages are written in ASD-STE100 Simplified Technical English; the rules are in [Writing documentation](../apps/fumadocs/content/docs/development/writing-docs.mdx).

## Pull Requests

Follow the [pull request template](pull_request_template.md). Each pull request should:

- explain the user-visible change
- stay focused on a single topic when possible
- include screenshots or screen recordings for new UI or behavior changes
- say which `apps/fumadocs` pages it updated, or state that none needed a change

If there is no visual change, say that explicitly in the PR description.

## Release Process

Version bumps, tags, and releases are maintainer-managed. Do not include release version changes in a normal contribution unless a maintainer asks for them.

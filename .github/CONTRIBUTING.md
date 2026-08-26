# Contributing to Freenary

Thanks for contributing to Freenary.

## Before You Start

- Read [`CONTEXT.md`](../CONTEXT.md) — Freenary is an open-source, AI-powered personal finance and wealth-management platform. Keep changes aligned with that vision.
- Keep changes scoped to a clear user-facing improvement, bug fix, or refactor.
- Follow the code standards in [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — the repo uses Ultracite (Oxlint + Oxfmt) with strict, auto-fixable rules.

## Local Setup

```bash
bun install
bun run db:start          # starts the Postgres container
bun run db:push           # applies the Prisma schema
bun run dev               # starts web (port 3001) + server (port 3000)
```

See the [README](../README.md) for environment variable details and Docker Compose workflows.

## Branch Naming

Use a clear, descriptive branch name that reflects the change.

Good examples:

- `fix/login-redirect-loop`
- `feat/portfolio-holdings-view`
- `chore/update-contributor-guide`

Avoid vague names like `test`, `misc`, or `changes`.

## Before Opening a PR

Run the same checks that CI runs:

```bash
bun x ultracite check
bun run build
```

Most lint/format issues are auto-fixable with `bun x ultracite fix`.

If your change affects UI, verify it in the browser, including light and dark mode.

## Pull Requests

Follow the [pull request template](pull_request_template.md). Each pull request should:

- explain the user-visible change
- stay focused on a single topic when possible
- include screenshots or screen recordings for new UI or behavior changes

If there is no visual change, say that explicitly in the PR description.

## Release Process

Version bumps, tags, and releases are maintainer-managed. Do not include release version changes in a normal contribution unless a maintainer asks for them.

# Freenary

Freenary is an open-source personal finance and wealth-management platform that you host yourself. It connects your banks, imports your accounts and transactions, categorises them, and shows you where your money goes. Your financial data stays in your own PostgreSQL database.

Freenary is under active development. The Budget area works end to end. Four areas — Portfolio, Analysis, Goals and AI — appear in the sidebar with a **Planned** badge and hold no data yet.

## The problem it solves

- Your money sits in many bank apps, and no app shows the complete picture.
- A proprietary aggregator holds your financial data on its own servers.
- A spreadsheet needs manual work every month, and it goes stale.

Freenary puts the accounts, the transactions and the categories in one place that you control.

## What Freenary does today

| Capability | State | Documentation |
| --- | --- | --- |
| Connect a bank through one bank provider (Powens or Enable Banking) | Built | [Bank connections](apps/fumadocs/content/docs/guides/bank-connections.mdx) |
| Import bank accounts, balances and transactions; import holdings with Powens | Built | [Bank providers](apps/fumadocs/content/docs/self-hosting/bank-providers.mdx) |
| Categorise transactions with deterministic rules and a merchant dictionary | Built | [Categorisation](apps/fumadocs/content/docs/development/categorisation.mdx) |
| Budget: periods, cash flow, spending breakdown, fixed against variable, budget against actual, transaction list | Built | [Budget](apps/fumadocs/content/docs/guides/budget.mdx) |
| Budgeting profile and custom categories | Built | [Categories and budget lines](apps/fumadocs/content/docs/guides/categories.mdx) |
| Sign in with a password, an emailed one-time code, a passkey, Google, Apple or single sign-on, plus two-factor authentication | Built | [Signing in](apps/fumadocs/content/docs/guides/signing-in.mdx) |
| English and French interface, light and dark appearance | Built | [Language and appearance](apps/fumadocs/content/docs/guides/interface.mdx) |
| Programmatic access over RPC and OpenAPI | Built | [API](apps/fumadocs/content/docs/integrations/api.mdx) |
| Portfolio, Analysis, Goals, AI | Planned | [Introduction](apps/fumadocs/content/docs/index.mdx) |

Freenary ships no Model Context Protocol server today. Read [MCP and AI tools](apps/fumadocs/content/docs/integrations/mcp.mdx) for the API path that replaces it.

## Requirements

| Item | Version | Note |
| --- | --- | --- |
| Docker Engine and Docker Compose | Compose v2 or later | The supported install path |
| PostgreSQL | 18 | The Compose stack runs it for you |
| Bun | 1.3.14 | Only for a source install or for development |
| Bank provider account | — | Optional. Without one, Freenary runs and imports no bank data. |
| Email provider account | — | Optional. Without one, Freenary sends no one-time code. |

## Quick start

These five commands give you a local instance. Do not expose this instance to the internet: it keeps development defaults. Read [Install with Docker Compose](apps/fumadocs/content/docs/self-hosting/docker-compose.mdx) for a real deployment.

```bash
git clone https://github.com/suiramdev/freenary.git
cd freenary
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" > .env
docker compose up -d --build
docker compose exec -w /app/packages/db server bun x prisma migrate deploy
```

The last command applies the database migrations. The Compose stack does not apply them for you, and the API server serves no data before this command succeeds.

Now check the two services:

```bash
curl http://localhost:3000/          # the API server answers: OK
curl -o /dev/null -w '%{http_code}\n' http://localhost:3001/   # the web app answers: 200
```

Open http://localhost:3001 and create the first account. Then follow [First steps](apps/fumadocs/content/docs/guides/first-steps.mdx).

## Documentation

The complete documentation lives in [`apps/fumadocs`](apps/fumadocs). Run it with `cd apps/fumadocs && bun run dev`, then open http://localhost:4000.

| Section | Read it for |
| --- | --- |
| [Introduction](apps/fumadocs/content/docs/index.mdx) | What Freenary is, and what it does today |
| [Concepts](apps/fumadocs/content/docs/concepts.mdx) | The vocabulary the rest of the documentation uses |
| [Using Freenary](apps/fumadocs/content/docs/guides/index.mdx) | Sign in, connect a bank, read the Budget area |
| [Self-hosting](apps/fumadocs/content/docs/self-hosting/index.mdx) | Install, configure, update, back up and monitor an instance |
| [Configuration reference](apps/fumadocs/content/docs/self-hosting/configuration.mdx) | Every environment variable, with its default |
| [Troubleshooting](apps/fumadocs/content/docs/self-hosting/troubleshooting.mdx) | A symptom, its cause and its fix |
| [Integrations](apps/fumadocs/content/docs/integrations/index.mdx) | The API, the procedure reference and MCP |
| [Development](apps/fumadocs/content/docs/development/index.mdx) | Set up the code, run the checks, open a pull request |
| [Architecture](apps/fumadocs/content/docs/development/monorepo.mdx) | Workspaces, request flow and build |

## Development

```bash
bun install
bun run dev:up     # the containerised stack: PostgreSQL, migrations, API server, web app, docs
```

`dev:up` needs [OrbStack](https://orbstack.dev) because the dev stack publishes no host port and reaches you through OrbStack hostnames. Without OrbStack, run the local path:

```bash
bun run db:start   # PostgreSQL in a container
bun run db:push    # apply the Prisma schema
bun run dev        # web app on 3001, API server on 3000, docs on 4000
```

Run the same checks as continuous integration before you open a pull request:

```bash
bun run check         # Oxlint and Oxfmt through Ultracite
bun run check-types   # TypeScript
bun run build         # every app
```

More detail: [Development](apps/fumadocs/content/docs/development/index.mdx) and [Local development stack](apps/fumadocs/content/docs/development/local-stack.mdx).

## Repository layout

```
freenary/
├── apps/
│   ├── web/         # web app (React, TanStack Start)
│   ├── server/      # API server (Elysia, oRPC)
│   └── fumadocs/    # documentation website
├── packages/
│   ├── api/         # procedures, bank providers, categorisation
│   ├── auth/        # Better Auth configuration and policy
│   ├── db/          # Prisma schema, migrations, client
│   ├── email/       # email adapters: log, Resend, SMTP
│   ├── env/         # environment-variable schemas
│   ├── ui/          # shared interface primitives
│   └── config/      # shared TypeScript configuration
└── docs/adr/        # architecture decision records
```

## Contributing

Read [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) first, then [`CONTEXT.md`](CONTEXT.md) for the product vocabulary and [`AGENTS.md`](AGENTS.md) for the code standards. Every pull request uses [the template](.github/pull_request_template.md).

## Support

- Report a problem or ask for a feature: [GitHub issues](https://github.com/suiramdev/freenary/issues/new/choose).
- Read [Troubleshooting](apps/fumadocs/content/docs/self-hosting/troubleshooting.mdx) before you open an issue about a deployment.

## License

This repository does not include a license file yet. Open an issue if you need the reuse terms.

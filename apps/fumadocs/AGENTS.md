# `apps/fumadocs`

The public documentation website.

## Stack

- **Fumadocs** (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui` aliased to `@fumadocs/base-ui`) — page tree, MDX pipeline, local search, and the theme's components.
- **TanStack Start** on **Vite** — same toolchain as `apps/web`, with SSR plus build-time prerendering. Nitro preset `vercel`; there is no Dockerfile for this app, and `docker-compose.yml` has no `docs` service.
- **Tailwind v4** via `@tailwindcss/vite`. `src/styles/app.css` imports `tailwindcss`, then Fumadocs' `neutral` and `preset` stylesheets. It does **not** import `@freenary/ui/globals.css`, so the docs palette is Fumadocs' own and does not follow `apps/web`.
- `bun run dev` serves on port **4000**, hardcoded in the `dev` script. `DOCS_PORT` is set by `compose.dev.yml` and read by nothing; `DOCS_HOST` is only an OrbStack domain label.

## Layout

```
content/docs/       # MDX pages — the whole site's content (see "Content structure")
src/
  lib/
    source.ts       # Fumadocs loader (content dir, page tree, LLM text)
    shared.ts       # App name, docs base route, repo coordinates, .md URL codec
    layout.shared.tsx  # Nav/GitHub options shared by every layout
  routes/           # TanStack Router file routes
  components/       # MDX component map, markdown renderer, AI search, not-found
  styles/app.css
```

## Content structure

The site is split **by audience**, and the split is load-bearing: it is why a reader can find anything. The root `meta.json` groups the folders under three separators.

| Path | Audience | Contains |
| --- | --- | --- |
| `index.mdx`, `concepts.mdx` | Everyone | Orientation and the shared vocabulary. |
| `guides/` | Users of a running instance | Signing in, first steps, bank connections, budget, categories, settings, language and appearance. |
| `self-hosting/` | Operators | Install, configuration reference, email, sign-in methods, bank providers, updates, backup, maintenance, security, logs, troubleshooting. |
| `integrations/` | Developers calling the API | API, procedure reference, MCP. |
| `development/` | Contributors and engineers | Workflow, local stack, architecture, data model, categorisation, bank-provider interface, writing docs. |

Three rules keep it that way:

- **No terminal in `guides/`.** Env vars, file paths, Docker, and package names belong in the other sections. If a reader needs a shell, the page is in the wrong folder.
- **A fact lives in exactly one section**; everywhere else links to it. Duplicated prose is the failure mode this structure exists to prevent.
- **Every page is ASD-STE100 Simplified Technical English.** Short active sentences, one idea each, no `-ing` verb forms, no contractions, `must`/`can`/`do` rather than `shall`/`should`/`may`, and one approved term per concept (the terms are defined in `content/docs/concepts.mdx`).

`development/writing-docs.mdx` is the reader-facing version of this section — update both together.

## Conventions

- Add a page by dropping an `.mdx` file in `content/docs/`; the sidebar and search index pick it up. Order and grouping come from `meta.json` files in that tree — a new page must be added to its folder's `pages` array or it lands at the bottom, unordered. Nested folders each with their own `meta.json` are supported.
- Only `title` is required by the schema. Write `description` and `icon` on every page anyway: the description feeds the page header and metadata.
- `icon` is resolved by the `lucideIconsPlugin` in `src/lib/source.ts` against **lucide's `icons` record**, which holds canonical PascalCase names only. A deprecated alias such as `AlertCircle` is a top-level `lucide-react` export but is absent from that record, so it renders nothing and only warns in the console. Check a name before you use it:
  ```bash
  grep -c "as CircleAlert }" node_modules/lucide-react/dist/esm/icons/index.mjs
  ```
- MDX may use only what `src/components/mdx.tsx` registers: Fumadocs' defaults (`Card`, `Cards`, `Callout`, `CalloutContainer`, `CalloutTitle`, `CalloutDescription`, the `CodeBlockTabs*` family, and the `pre`/`a`/`img`/`h1`-`h6`/`table` overrides) plus the components that file adds explicitly — `Accordion`, `Accordions`, `File`, `Files`, `Folder`, `Step`, `Steps`, `Tab`, `Tabs`, `TypeTable`. Anything else fails to render, and the build stays green.
- Code fences always name a **Shiki** language. `env` is not one — use `dotenv`. An unknown language fails the build, not just the page.
- Internal links are absolute site paths with no extension (`/docs/guides/budget`). A folder's index page is the folder path itself (`/docs/self-hosting`).
- Routes derive from the docs base route in `src/lib/shared.ts`. Change it there, not inline, so the `.md` and `llms.txt` endpoints stay consistent.
- Filenames are `kebab-case`; components are arrow functions assigned to a `const`, declared **before** the `Route` that references them (see the root `AGENTS.md`).
- `types:check` is this app's TypeScript script. The root `bun run check-types` runs `turbo run check-types` and therefore skips it — run `bun run types:check` here after a change to `src/`.

## Endpoints beyond the pages

- `/docs/<slug>.md` — raw Markdown for a page. The index page is `/docs/index.md`; `/docs.md` 404s (`encodeMarkdownUrl` maps empty slugs to `index.md`).
- `/llms.txt`, `/llms-full.txt` — the index and full corpus for LLM consumers. The only two that behave identically in dev and production.
- `/api/search` — local search backend.
- `/api/chat` — the "Ask AI" panel, backed by OpenRouter. It reads `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` straight from `process.env`; neither is declared in `packages/env`. The trigger renders even with no key.

**Markdown output is production-only, and negotiation never fires.** Measured, both modes:

| Request | `vite dev` | `build` + `serve` |
| --- | --- | --- |
| `/docs/<slug>.md` | 404 | 200 `text/markdown` |
| `/docs/<slug>` + `Accept: text/markdown` | 307 → `.md`, which 404s | 200 `text/html`, no redirect |

The `{$}.md` route does not register under `vite dev` (upstream TanStack Start dev-router limitation), so `llmMiddleware` in `src/start.ts` redirects Markdown-preferring requests into a 404. In production the `.md` routes work, but the middleware never runs for a page URL — Nitro serves the prerendered HTML first. Don't document negotiation as working.

That redirect also emits an `http://` `Location` behind a TLS proxy, because it rebuilds the URL from `request.url`. Unfixed; it only matters if negotiation is ever revived.

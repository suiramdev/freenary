# `apps/fumadocs`

The public documentation website.

## Stack

- **Fumadocs** (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui` aliased to `@fumadocs/base-ui`) — page tree, MDX pipeline, local search, and the theme's components.
- **TanStack Start** on **Vite** — same toolchain as `apps/web`, with SSR plus build-time prerendering. Nitro preset `vercel`; there is no Dockerfile for this app, and `docker-compose.yml` has no `docs` service.
- **Tailwind v4** via `@tailwindcss/vite`. `src/styles/app.css` imports `tailwindcss`, then Fumadocs' `neutral` and `preset` stylesheets. It does **not** import `@freenary/ui/globals.css`, so the docs palette is Fumadocs' own and does not follow `apps/web`.
- `bun run dev` serves on port **4000**, hardcoded in the `dev` script. `DOCS_PORT` is set by `docker-compose.dev.yml` and read by nothing; `DOCS_HOST` is only an OrbStack domain label.

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

The site serves two audiences, in this order: the **person who runs Freenary and uses it**, and the **contributor who changes it**. The first three pages carry a reader from nothing to a working instance; every folder after them goes deeper on one job. The root `meta.json` holds the order and the separators:

```
index → quickstart → concepts
  → ---Run Freenary--- → self-hosting
  → ---Use Freenary--- → guides
  → ---Build on Freenary--- → integrations
  → ---Contribute--- → contributing
```

| Path | Audience | Contains |
| --- | --- | --- |
| `index.mdx` | Everyone | What Freenary is, and the three routes into the site. A hub: one line and one link per destination. |
| `quickstart.mdx` | A reader with Docker and no instance | The shortest path to a running instance on one machine, and the first sign-in. It owns the short install. |
| `concepts.mdx` | Users | A plain glossary of the words a user meets in the interface. |
| `self-hosting/` | Operators | The served install (the folder's index page), configuration, reverse proxy, email, sign-in methods, bank providers, assistant, scaling, updates, backup and restore, maintenance, security, logs, troubleshooting, build from source. |
| `guides/` | Users of a running instance | Signing in, first steps, bank connections, budget, categories, assistant, settings, language and appearance. |
| `integrations/` | Developers calling the API | API, procedure reference, MCP. |
| `contributing/` | Contributors and engineers | Workflow, architecture, local stack, data model, categorisation, bank-provider interface, writing docs, releasing. |

`quickstart.mdx` and `self-hosting/index.mdx` split on one line: the quickstart runs an instance for the reader on `localhost`, and `self-hosting/index.mdx` serves an instance to other people. The public origins, the secrets, the reverse proxy and the verification steps belong to the second. Neither repeats the other.

These rules keep the split that way:

- **No terminal in `guides/`.** Env vars, file paths, Docker, package names, and database or enum names belong in the other sections. If a reader needs a shell, the page is in the wrong folder. `docs:check` fails a guide that holds a shell fence or a `SCREAMING_SNAKE` token.
- **No page titled `Overview`, and no section heading called Overview.** A folder's index page is named after its subject and puts the reader straight on the task — `self-hosting/index.mdx` _is_ the served install.
- **No roadmap anywhere.** Never write that a feature is planned, is coming soon, or is not built yet; never write a "what Freenary does today" list or a Built-against-Planned table. State only what a reader can do, and leave the rest out.
- **How it works belongs to `contributing/`.** Architecture, request flow, and internals go there — not in `guides/`, which tells a user what to do, and not in `self-hosting/`, which tells an operator how to run it.
- **A fact lives in exactly one section**; everywhere else links to it. Duplicated prose is the failure mode this structure exists to prevent.
- **`concepts.mdx` is a user glossary**, in the reader's own words. The technical vocabulary — Prisma model names, enum values, columns — lives in `contributing/data-model.mdx`.
- **Every page is ASD-STE100 Simplified Technical English.** Short active sentences, one idea each, no `-ing` verb forms, no contractions, `must`/`can`/`do` rather than `shall`/`should`/`may`, and one approved term per concept (the user-facing terms are defined in `content/docs/concepts.mdx`). The rules cover prose, never code blocks.

`contributing/writing-docs.mdx` is the reader-facing version of this section — update both together.

## The workflow: how a page gets written

An agent that writes or rewrites documentation runs these five steps in order. Steps 2 and 3 fan out; the rest do not.

1. **Read the rules.** This file, and the page you are about to replace. A rewrite keeps every true fact the old page carried.
2. **Gather the code truth first, and write nothing yet.** One read-only scout per subsystem — the compose files and `packages/env` for configuration, `packages/auth` for sign-in, `packages/api` for the bank providers and the procedures, `apps/web` for the screens, `packages/db` for the vocabulary. Each returns a fact sheet with `file:line` evidence. A page that describes a screen, a flag or an endpoint that no scout found is wrong: cut the claim.
3. **Write in parallel, one owner per folder.** Two agents never hold the same file. `meta.json` and `index.mdx` belong to whoever owns the folder.
4. **Run the gate until it is silent.**
   ```bash
   bun run docs:check          # from apps/fumadocs, or `bun run docs:check` at the root
   bun run docs:check --strict # warnings fail too
   bun run build               # frontmatter schema, MDX compile, fence languages, prerender
   ```
5. **Load the pages.** `bun run dev`, then open every page you changed. A green gate proves the page compiles and obeys the rules. It does not prove the page is right, and it never proves a screenshot-free walkthrough matches the screen.

### What each check catches

| Mistake | `bun run build` | `bun run docs:check` |
| --- | --- | --- |
| No frontmatter `title`, `description` or `icon` | Fails | Fails |
| A frontmatter field outside title/description/icon/full | Passes | Fails |
| An unknown code-fence language | Fails | Fails |
| An `icon` that is not in lucide's `icons` record | Passes, renders nothing | Fails |
| A component `src/components/mdx.tsx` does not register | Passes, renders nothing | Fails |
| An internal link or `#anchor` that resolves to nothing | Passes | Fails |
| A page missing from its folder's `meta.json` | Passes | Fails |
| A shell command or an env var in `guides/` | Passes | Fails |
| A contraction, a banned word, roadmap language | Passes | Fails |
| A sentence over 25 words | Passes | Fails |
| A sentence over 20 words, a paragraph over 6 sentences | Passes | Warns |

`scripts/check-docs.ts` reads the component list from `getMDXComponents()` and the icon list from lucide's own record, so neither can drift from the site. `scripts/docs-rules.ts` holds the word lists. A page that has to name a banned word — the authoring page — writes `{/* docs-check disable: ste-word, no-roadmap */}`.

## Conventions

- Add a page by dropping an `.mdx` file in `content/docs/`; the sidebar and search index pick it up. Order and grouping come from `meta.json` files in that tree — a new page must be added to its folder's `pages` array or it lands at the bottom, unordered. Nested folders each with their own `meta.json` are supported.
- The frontmatter schema in `src/lib/source.ts` needs `title`, `description` and `icon`. A page without one of the three fails the build with the file name and the field. `full` is the only other field it accepts.
- `icon` is resolved by the `lucideIconsPlugin` in `src/lib/source.ts` against **lucide's `icons` record**, which holds canonical PascalCase names only. A deprecated alias such as `AlertCircle` is a top-level `lucide-react` export but is absent from that record, so it renders nothing and only warns in the console. `docs:check` fails on it; to check one name by hand:
  ```bash
  grep -c "as CircleAlert }" node_modules/lucide-react/dist/esm/icons/index.mjs
  ```
- MDX may use only what `src/components/mdx.tsx` registers: Fumadocs' defaults (`Card`, `Cards`, `Callout`, `CalloutContainer`, `CalloutTitle`, `CalloutDescription`, the `CodeBlockTabs*` family, and the `pre`/`a`/`img`/`h1`-`h6`/`table` overrides) plus the components that file adds explicitly — `Accordion`, `Accordions`, `File`, `Files`, `Folder`, `Step`, `Steps`, `Tab`, `Tabs`, `TypeTable`. Anything else fails to render, the build stays green, and `docs:check` fails.
- Code fences always name a **Shiki** language. `env` is not one — use `dotenv`. An unknown language fails the build, not just the page. The ids this site uses are the list in `scripts/docs-rules.ts`.
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

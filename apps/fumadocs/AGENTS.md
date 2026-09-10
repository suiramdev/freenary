# `apps/fumadocs`

The public documentation website.

## Stack

- **Fumadocs** (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui` aliased to `@fumadocs/base-ui`) — page tree, MDX pipeline, local search, and the theme's components.
- **TanStack Start** on **Vite** — same toolchain as `apps/web`, with SSR plus build-time prerendering. Nitro preset `vercel`; there is no Dockerfile for this app, and `docker-compose.yml` has no `docs` service.
- **Tailwind v4** via `@tailwindcss/vite`. `src/styles/app.css` imports `tailwindcss`, then Fumadocs' `neutral` and `preset` stylesheets. It does **not** import `@freenary/ui/globals.css`, so the docs palette is Fumadocs' own and does not follow `apps/web`.
- `bun run dev` serves on port **4000**, hardcoded in the `dev` script. `DOCS_PORT` is set by `docker-compose.dev.yml` and read by nothing; `DOCS_HOST` is only an OrbStack domain label.

## Layout

```
content/docs/
  meta.json         # the version list, and the dropdown order
  next/             # MDX pages for the unreleased code — the folder you edit
  <X.Y>/            # one frozen copy per release, written by the snapshot script
src/
  lib/
    source.ts       # Fumadocs loader (content dir, page tree, LLM text, version list)
    versions.ts     # version ids, ordering, and the link resolver
    shared.ts       # App name, docs base route, repo coordinates, .md URL codec
    layout.shared.tsx  # Nav/GitHub options shared by every layout
  routes/           # TanStack Router file routes
  components/       # MDX component map, markdown renderer, AI search, not-found
  styles/app.css
scripts/
  check-docs.ts     # the gate
  snapshot-version.ts  # freezes `next` as a release folder
```

## Versions

Every page is served under a version segment: `/docs/next/quickstart`, `/docs/1.2/quickstart`. The rules that follow from that:

- **Author in `content/docs/next`.** A change edits that folder alone. `content/docs/<X.Y>` is frozen: only a correction to that release touches it.
- **A folder under `content/docs` is a version.** Its `meta.json` carries `"root": true` and a `title` equal to the folder name. `root: true` is what scopes the sidebar to one version and makes Fumadocs render the version dropdown (`getLayoutTabs`, `TreeContextProvider`). `docs:check` fails a folder that breaks either rule.
- **A docs link never names a version.** Pages write `/docs/guides/budget`; the `a` and `Card` wrappers in `src/components/mdx.tsx` prepend the version of the page being read, and `getLLMText` does the same for the `.md` output. `docs:check` fails an authored link that names a version.
- **A repository link names the branch, and the snapshot pins it.** Pages write `https://github.com/suiramdev/freenary/blob/main/…`; the snapshot rewrites each one to `blob/v<X.Y.Z>/` in the copy, because that link cannot resolve at render time. `docs:check` fails a `blob/main` link inside a frozen version.
- **`/docs/*` with no version redirects** (307) to the newest release. `versionMiddleware` in `src/start.ts` owns it, and it runs before `llmMiddleware`. The newest release is `stableVersion()` in `src/lib/source.ts`: the highest `X.Y` folder, or `next` while no release exists.
- **The language rules apply to `next` alone**; the structure rules apply to every version. `check-docs.ts` skips `checkHeadings`, `checkPhrases` and `checkSentences` outside `next`.
- **A release snapshots itself.** The `tag` job of `.github/workflows/release.yml` runs `scripts/snapshot-version.ts <X.Y.Z>` and commits the folder before it tags; the script derives the `X.Y` folder from the release version and pins repository links to `v<X.Y.Z>`. By hand: `bun run docs:snapshot 1.2.0`. Every import the script makes resolves to a source file or a node built-in, never to a package, so it runs in a checkout with no `node_modules` — keep `src/lib/versions.ts` and `src/lib/shared.ts` dependency-free. It stages the copy outside `content/docs` and rewrites the root `meta.json` on every run, so a repeat run finishes an interrupted one; a pre-release snapshots nothing.
- **Search, the AI panel and the LLM endpoints are scoped.** `/api/search` tags each record with its version and the default dialog passes `defaultTag` — the version of the pathname, or the newest release off the docs tree, from the root loader in `src/routes/__root.tsx`. `/api/chat` builds one index per version and honours the request body's version only when `listVersions()` holds it. `/llms.txt` and `/llms-full.txt` serve the newest release alone.

## Content structure

The site serves three audiences: the **person who uses Freenary**, the **operator who runs an instance**, and the **contributor who changes the code**. Six top-level sections group the pages by the reader's intent. Every path below is inside a version folder, and that folder's own `meta.json` carries both the order and the label of each section:

```
index
  → getting-started
  → guides (label: "Using Freenary")
  → integrations
  → self-hosting
  → developers
  → help
```

| Path | Audience | Contains |
| --- | --- | --- |
| `index.mdx` | Everyone | What Freenary is, and one link per section. |
| `getting-started/` | A reader with no instance | Introduction, quickstart, how Freenary works, next steps. |
| `guides/` | Users of a running instance | Accounts, transactions, budget, goals, investments, reports, signing in, the assistant, settings, language and appearance. |
| `integrations/` | Users and operators | Powens, and other integrations (Enable Banking). |
| `self-hosting/` | Operators | Docker, configuration, backup and restore, security, maintenance, scaling, logs, build from source, next steps. |
| `developers/` | Contributors and engineers | Development setup, architecture, API, integrations, contributing. |
| `help/` | Everyone | Troubleshooting, FAQ, get support. |

These rules keep the split:

- **No terminal in `guides/`.** Env vars, file paths, Docker, package names, and database or enum names belong in integrations/, self-hosting/ or developers/. If a reader needs a shell, the page is in the wrong folder. `docs:check` fails a guide that holds a shell fence or a `SCREAMING_SNAKE` token.
- **No page titled `Overview`, and no section heading called Overview.** A folder's index page is named after its subject.
- **A subject is one page, never a folder.** A section holds pages only: `guides/accounts.mdx` carries the account types, adding, editing and balances under one `##` heading each, rather than a `guides/accounts/` folder of four pages. The sidebar draws a section as one always-open separator with its pages flat under it, so a folder there would be a disclosure row inside a group that needs none. `docs:check` fails a page or a `meta.json` below `<version>/<section>/`. A page that grows past a screenful of headings is a sign the subject belongs in two sibling pages, not in a folder.
- **No roadmap anywhere.** Never write that a feature is planned, is coming soon, or is not built yet. State only what a reader can do, and leave the rest out.
- **How it works belongs to `developers/`.** Architecture, request flow, and internals go there — not in `guides/`, which tells a user what to do, and not in `self-hosting/`, which tells an operator how to run it.
- **A fact lives in exactly one section**; everywhere else links to it. Duplicated prose is the failure mode this structure exists to prevent.
- **`getting-started/how-it-works.mdx` is a user glossary**, in the reader's own words. The technical vocabulary — Prisma model names, enum values, columns — lives in the `## Data model` section of `developers/architecture.mdx`.
- **Every page is ASD-STE100 Simplified Technical English.** Short active sentences, one idea each, no `-ing` verb forms, no contractions, `must`/`can`/`do` rather than `shall`/`should`/`may`, and one approved term per concept (the user-facing terms are in `next/getting-started/how-it-works.mdx`). The rules cover prose, never code blocks, and `docs:check` applies them to `next` alone.

The `Writing documentation` section of `developers/contributing.mdx` is the reader-facing version of this section — update both together.

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
| No frontmatter `title` or `description` | Fails | Fails |
| A frontmatter field outside title/description/full, `icon` included | Passes | Fails |
| An unknown code-fence language | Fails | Fails |
| A section separator with no icon, or an icon outside lucide's `icons` record | Passes, renders nothing | Fails |
| A section folder named in a version `meta.json` rather than extracted with `...` | Passes, renders a disclosure row | Fails |
| A component `src/components/mdx.tsx` does not register | Passes, renders nothing | Fails |
| An internal link or `#anchor` that resolves to nothing | Passes | Fails |
| A page missing from its folder's `meta.json` | Passes | Fails |
| A page or a `meta.json` below `<version>/<section>/` | Passes | Fails |
| A link that names a version | Passes | Fails |
| A version folder without `"root": true`, or with a stale title | Passes, drops out of the dropdown | Fails |
| A `blob/main` repository link in a frozen version | Passes | Fails (releases only) |
| A shell command or an env var in `guides/` | Passes | Fails |
| A contraction, a banned word, roadmap language | Passes | Fails (`next` only) |
| A sentence over 25 words | Passes | Fails (`next` only) |
| A sentence over 20 words, a paragraph over 6 sentences | Passes | Warns (`next` only) |

`scripts/check-docs.ts` reads the component list from `getMDXComponents()` and the icon list from lucide's own record, so neither can drift from the site. `scripts/docs-rules.ts` holds the word lists. A passage that has to name a banned word — the authoring standard in `developers/contributing.mdx` — opens with `{/* docs-check disable: ste-word, no-roadmap */}` and closes with `{/* docs-check enable */}`; the rules stay on above and below that pair, and a `disable` with no `enable` runs to the end of the page.

## Conventions

- Add a page by dropping an `.mdx` file in a section folder of `content/docs/next/`; the sidebar and search index pick it up. Order comes from the section's `meta.json` — a new page must be added to its `pages` array or it lands at the bottom, unordered. A folder below a section is a gate error: see **A subject is one page, never a folder**.
- The frontmatter schema in `src/lib/source.ts` needs `title` and `description`. A page without one of the two fails the build with the file name and the field. `full` is the only other field it accepts.
- **An icon marks a section, and nothing else.** A section is a Fumadocs separator in `content/docs/next/meta.json` — `"---[Compass]Using Freenary---"` — followed by `"...guides"`, which lifts the folder's pages up beside it. So the label and its icon live in that one array, a page and a `meta.json` carry none, and `docs:check` fails either that does. The sidebar therefore draws the theme's own separator, always open with its pages flat under it, rather than a disclosure row; `src/routes/docs/$.tsx` passes `breadcrumb={{ includeSeparator: true }}` to `DocsPage` so the section still names itself above the title. A section's own `meta.json` holds `pages` alone: it orders the pages, and nothing else in it renders.
- `icon` is resolved by the `lucideIconsPlugin` in `src/lib/source.ts` against **lucide's `icons` record**, which holds canonical PascalCase names only. A deprecated alias such as `AlertCircle` is a top-level `lucide-react` export but is absent from that record, so it renders nothing and only warns in the console. `docs:check` fails on it; to check one name by hand:
  ```bash
  grep -c "as CircleAlert }" node_modules/lucide-react/dist/esm/icons/index.mjs
  ```
- MDX may use only what `src/components/mdx.tsx` registers: Fumadocs' defaults (`Card`, `Cards`, `Callout`, `CalloutContainer`, `CalloutTitle`, `CalloutDescription`, the `CodeBlockTabs*` family, and the `pre`/`a`/`img`/`h1`-`h6`/`table` overrides) plus the components that file adds explicitly — `Accordion`, `Accordions`, `File`, `Files`, `Folder`, `Step`, `Steps`, `Tab`, `Tabs`, `TypeTable`. Anything else fails to render, the build stays green, and `docs:check` fails.
- Code fences always name a **Shiki** language. `env` is not one — use `dotenv`. An unknown language fails the build, not just the page. The ids this site uses are the list in `scripts/docs-rules.ts`.
- Internal links are absolute site paths with no extension and no version (`/docs/guides/budget`). A section's index page is the section path itself (`/docs/self-hosting`), and a part of a page is its anchor (`/docs/guides/accounts#balances`). The rendered link carries the version of the page it sits on.
- Routes derive from the docs base route in `src/lib/shared.ts`. Change it there, not inline, so the `.md` and `llms.txt` endpoints stay consistent.
- Filenames are `kebab-case`; components are arrow functions assigned to a `const`, declared **before** the `Route` that references them (see the root `AGENTS.md`).
- `types:check` is this app's TypeScript script. The root `bun run check-types` runs `turbo run check-types` and therefore skips it — run `bun run types:check` here after a change to `src/`.

## Endpoints beyond the pages

- `/docs/<version>/<slug>.md` — raw Markdown for a page. The version index page is `/docs/<version>.md`; a path with no version redirects to the newest release first.
- `/llms.txt`, `/llms-full.txt` — the index and full corpus for LLM consumers, for the newest release alone. The only two that behave identically in dev and production.
- `/api/search` — local search backend. Each record carries its version as a `tag`, and the dialog filters on the version being read.
- `/api/chat` — the "Ask AI" panel, backed by OpenRouter. One search index per version, chosen by the `version` field of the request body. It reads `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` straight from `process.env`; neither is declared in `packages/env`. The trigger renders even with no key.

**Markdown output is production-only, and negotiation never fires.** Measured, both modes:

| Request | `vite dev` | `build` + `serve` |
| --- | --- | --- |
| `/docs/<slug>.md` | 404 | 200 `text/markdown` |
| `/docs/<slug>` + `Accept: text/markdown` | 307 → `.md`, which 404s | 200 `text/html`, no redirect |

The `{$}.md` route does not register under `vite dev` (upstream TanStack Start dev-router limitation), so `llmMiddleware` in `src/start.ts` redirects Markdown-preferring requests into a 404. In production the `.md` routes work, but the middleware never runs for a page URL — Nitro serves the prerendered HTML first. Don't document negotiation as working.

That redirect also emits an `http://` `Location` behind a TLS proxy, because it rebuilds the URL from `request.url`. Unfixed; it only matters if negotiation is ever revived.

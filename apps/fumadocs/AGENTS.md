# `apps/fumadocs`

The public documentation site.

## Stack

- **Fumadocs** (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`) — page tree, MDX pipeline, local search, and the theme's components.
- **TanStack Start** on **Vite** — same toolchain as `apps/web`, with SSR plus build-time prerendering.
- **Tailwind v4** via `@tailwindcss/vite`. `src/styles/app.css` imports `@freenary/ui/globals.css` and then Fumadocs' **`shadcn` preset**, which reads the same `--background` / `--primary` / `--sidebar-*` variables the app defines — so the docs palette, radius, and fonts follow `apps/web` with no second palette to maintain. Change colors in `packages/ui`, never here.
- `bun run dev` serves on `DOCS_PORT` (default 3000); `DOCS_HOST` adds an allowed host.

## Layout

```
content/docs/       # MDX pages — the whole site's content (see "Content structure")
src/
  lib/
    source.ts       # Fumadocs loader (content dir, page tree, LLM text)
    shared.ts       # App name, docs base route, repo coordinates, .md URL codec
    layout.shared.tsx  # Nav/GitHub options shared by every layout
  routes/           # TanStack Router file routes
  components/       # MDX component map, not-found, and the landing-page chrome
  styles/app.css
```

`/` is a full-bleed landing page modelled on `apps/web`'s onboarding route — the shared dither shader behind a spotlight scrim, a minimal top bar, centred copy — so it deliberately sits **outside** Fumadocs' `HomeLayout`. `dither-background.tsx` mirrors the app's component and must stay in lockstep with it; `home-backdrop.tsx` keeps the app's reduced-motion guard, which drops the WebGL layer entirely.

## Content structure

The site is split **by audience**, and the split is load-bearing: it is why a reader can find anything. Root `meta.json` groups the folders under three separators.

| Path | Audience | Contains |
| --- | --- | --- |
| `index.mdx`, `concepts.mdx` | Everyone | Orientation and the shared domain vocabulary. |
| `guides/` | Teams using freenary | Product usage: organizations, projects, missions, agents, inbox. |
| `self-hosting/` | Operators | Docker stack, env configuration, migrations, sandboxing, deploy. |
| `integrations/` | Developers wiring it | Model providers, GitHub/GitLab/Forgejo, programmatic API access. |
| `architecture/` | Engineers on the code | Monorepo, data model, API layer, orchestration, runtime, secrets. |
| `contributing/` | Contributors | Workflow, standards, testing, PRs, and writing these docs. |

Two rules keep it that way:

- **No terminal in `guides/`.** Env vars, file paths, Docker, and package names belong in the other sections. If a reader needs a shell, the page is in the wrong folder.
- **A fact lives in exactly one section**; everywhere else links to it. Duplicated prose is the failure mode this structure exists to prevent.

`contributing/writing-docs.mdx` is the reader-facing version of this section — update both together.

## Conventions

- Add a page by dropping an `.mdx` file in `content/docs/`; the sidebar and search index pick it up. Order and grouping come from `meta.json` files in that tree — a new page must be added to its folder's `pages` array or it lands at the bottom, unordered.
- Every page needs `title`, `description`, and `icon` frontmatter. The description feeds the page header and metadata; `icon` is a **lucide-react** export name, resolved by the `lucideIconsPlugin` in `src/lib/source.ts` — a name that is only an alias silently renders nothing, so check `lucide-react`'s type declarations.
- MDX may use only what `src/components/mdx.tsx` registers. `Card`/`Cards`/`Callout` and the code-block components come from Fumadocs' defaults; `Steps`/`Step`, `Tabs`/`Tab`, `Files`/`Folder`/`File`, and `TypeTable` are registered explicitly. Anything else fails to render.
- Code fences always name a **Shiki** language. `env` is not one — use `dotenv`. An unknown language fails the build, not just the page.
- Internal links are absolute site paths with no extension (`/docs/guides/missions`).
- Routes derive from the docs base route in `src/lib/shared.ts`. Change it there, not inline, so the `.md` and `llms.txt` endpoints stay consistent.
- Filenames are `kebab-case`; components are arrow functions assigned to a `const`, declared **before** the `Route` that references them (see the root `AGENTS.md`).

## Endpoints beyond the pages

- `/docs/<slug>.md` — raw Markdown for a page. The index page is `/docs/index.md`; `/docs.md` 404s (`encodeMarkdownUrl` maps empty slugs to `index.md`).
- `/llms.txt`, `/llms-full.txt` — the index and full corpus for LLM consumers. The only two that behave identically in dev and production.
- `/api/search` — local search backend.

**Markdown output is production-only, and negotiation never fires.** Measured, both modes:

| Request | `vite dev` | `build` + `serve` |
| --- | --- | --- |
| `/docs/<slug>.md` | 404 | 200 `text/markdown` |
| `/docs/<slug>` + `Accept: text/markdown` | 307 → `.md`, which 404s | 200 `text/html`, no redirect |

The `{$}.md` route does not register under `vite dev` (upstream TanStack Start dev-router limitation), so `llmMiddleware` in `src/start.ts` redirects Markdown-preferring requests into a 404. In production the `.md` routes work, but the middleware never runs for a page URL — Nitro serves the prerendered HTML first. Don't document negotiation as working.

That redirect also emits an `http://` `Location` behind a TLS proxy, because it rebuilds the URL from `request.url`. Unfixed; it only matters if negotiation is ever revived.

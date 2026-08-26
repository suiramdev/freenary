# `apps/fumadocs`

The public documentation site.

## Stack

- **Fumadocs** (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`) — page tree, MDX pipeline, local search, and theme components.
- **TanStack Start** on **Vite** — with SSR plus build-time prerendering.
- **Tailwind v4** via `@tailwindcss/vite`. `src/styles/app.css` imports Fumadocs' `shadcn` preset.
- **AI chat** — `/api/chat` endpoint using the AI SDK with OpenRouter.
- `bun run dev` serves on port 4000.

## Layout

```
content/docs/       # MDX pages — the whole site's content
src/
  lib/
    source.ts       # Fumadocs loader (content dir, page tree, LLM text)
    shared.ts       # App name, docs base route, repo coordinates
    layout.shared.tsx  # Nav/GitHub options shared by every layout
  routes/           # TanStack Router file routes
  components/       # MDX component map, not-found, AI chat, markdown renderer
  styles/app.css
```

## Content structure

Pages are MDX files dropped into `content/docs/`. The sidebar and search index pick them up automatically. Order and grouping come from `meta.json` files — a new page must be added to its folder's `pages` array.

## Conventions

- Every page needs `title`, `description`, and `icon` frontmatter. `icon` is a **lucide-react** export name.
- MDX may use only what `src/components/mdx.tsx` registers.
- Code fences always name a **Shiki** language. `env` is not one — use `dotenv`.
- Internal links are absolute site paths with no extension (`/docs/guides/budgeting`).
- Filenames are `kebab-case`; components are arrow functions assigned to a `const`.

## Endpoints beyond the pages

- `/llms.txt`, `/llms-full.txt` — index and full corpus for LLM consumers.
- `/api/search` — local search backend.
- `/api/chat` — AI chat endpoint.

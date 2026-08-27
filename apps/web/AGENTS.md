# `apps/web`

## Stack

- **Vite** dev server (`bun run dev:web`, port `WEB_PORT` or 5173).
- **TanStack Router** for type-safe file-based routing — routes live in `src/routes/`.
- **TanStack Query** + `@orpc/tanstack-query` — typed queries derived from the server router type.
- **Better Auth** client for sessions; auth state syncs with `apps/server`.
- **shadcn/ui primitives** from `@freenary/ui` — do not duplicate components locally.
- **Tailwind v4** via `@tailwindcss/vite`; `src/index.css` imports the tokens from `@freenary/ui/globals.css`.

## Layout

```
src/
  main.tsx        # Vite entry; creates the TanStack Router (routeTree.gen)
  index.css       # Imports @freenary/ui/globals.css
  routes/         # File-based routes (pages own data fetching)
  components/
    shared/       # App-wide components used by multiple features
    <feature>/    # Feature-specific components (auth, agent, project, …)
  hooks/
    shared/       # Cross-feature hooks (use-debounced-value, …)
    <feature>/    # Feature-specific hooks
  utils/          # oRPC client + query client (orpc.ts)
  lib/            # Client helpers (auth-client, …) and per-feature libs (lib/<feature>/)
```

`components/dither-kit/` is the one exception to everything below: a vendored dithered-charting kit, excluded from linting in `oxlint.config.ts`. Compose it, don't restructure it.

## Conventions

- Shared primitives live in `packages/ui`. Import as `@freenary/ui/components/button`. Add app-specific blocks here only when they aren't reusable.
- API types: import the **router type** from `@freenary/api`, never the implementation. The oRPC client provides full inference.
- Env vars must be prefixed `VITE_` and declared in `@freenary/env/src/web.ts`.
- Follow the Ultracite + React rules in the root `CLAUDE.md` — no class components, hooks at top level, semantic HTML.
- Filenames are `kebab-case` (e.g. `login-form.tsx`); components are arrow functions assigned to a `const` (`export const LoginForm = () => { … }`), never `function` declarations.

## Component and hook structure

UI code is organized by feature, flat within each feature:

```txt
@/components/shared/<name>.tsx     # generic, reusable, no feature-specific behavior
@/components/<feature>/<name>.tsx  # owned by one feature
@/hooks/<feature>/<name>.ts        # feature-specific hooks (forms, polling, etc.)
@/lib/<feature>/<name>.ts          # feature-specific non-UI helpers and data
```

### Atomic design (implicit)

Components follow atomic design as a **mental model, not a directory structure** — never create `atoms/`, `molecules/`, or `organisms/` folders. All of a feature's components sit flat in `@/components/<feature>/`; the level lives in how a component is designed:

- **Atom-scale** — the smallest reusable elements: badges, labels, status dots, feature-specific wrappers around `@freenary/ui` primitives (`agent-status-dot.tsx`, `org-avatar.tsx`). Purely presentational, no business logic, no data fetching.
- **Molecule-scale** — small groups composing a few atoms into one reusable unit: cards, form field groups, list rows (`agent-profile-fields.tsx`, `agent-latest-run.tsx`). May hold light local UI state (open/closed, input value), never a full feature workflow.
- **Organism-scale** — distinct sections of the interface, coordinating molecules, atoms, and other organisms (`agent-detail.tsx`, `org-general-section.tsx`, `project-list.tsx`). Presentation-focused: they receive data as props from the route (see “Data fetching” below) and own layout, not fetching.

Atomic design's remaining stages map onto existing structure rather than components: route layouts play the template role, and route files in `src/routes/` are the page stage — they pour in real content by fetching data and passing it down.

When building UI, still decompose top-down into these levels: split out the smallest practical, reusable units and compose sections from them. But avoid unnecessary fragmentation — don't extract a component that has exactly one caller and no reuse prospect, and never let the taxonomy leak into file paths, filenames, or component names.

### Data fetching

Section-level (organism-scale) components are presentation-focused and must **not** fetch their own data. `useQuery` calls belong at the page level — the route files in `src/routes/` — with results passed down as props (including `isPending` flags when the component renders loading states).

Exceptions that may keep queries local:

- Interactive, lazily-triggered queries (search-as-you-type, dialog-scoped OAuth polling) where page-level fetching makes no sense.
- Mutations (`useMutation`/`useQueryClient` invalidation) stay in the component or hook that triggers them.

### Loading states

**Data that is loading is a skeleton, never a spinner.** Anything whose content arrives from a query — a section on first paint, a list, a field filled from the server — renders a skeleton the same shape and size as the thing it stands in for, so what arrives lands where the placeholder was instead of shoving the page down. A spinner is a different size from the content that replaces it, which is exactly the jump a skeleton exists to prevent — and it is worst on first load, where the whole screen is the placeholder.

`RandomSpinner` is for the other kind of waiting: a control that is busy because somebody pressed it. A Save or Create button, a Connect flow, a dialog's confirm — the layout is already settled there, and the spinner belongs inside the control that was pressed.

Give a skeleton the shape of its real counterpart rather than a generic block: build it from `Skeleton` (`@freenary/ui/components/skeleton`) next to the component it stands for (`brief-editor.tsx` → `brief-editor-skeleton.tsx`), and match the real heights and gaps. One skeleton serves every scope that renders the same component.

A placeholder is decoration, so put `aria-busy="true"` on the region and one `role="status"` `sr-only` line naming what is loading, then `aria-hidden="true"` over the bars themselves — including any nested skeleton, so nothing announces twice.

### Import rules

```tsx
import { LoginForm } from "@/components/auth/login-form";
import { Loader } from "@/components/shared/loader";
import { useAgentForm } from "@/hooks/agent/use-agent-form";
```

Avoid importing across feature trees unless the dependency is intentional. If a component is needed by multiple unrelated features, move it to `@/components/shared/`.

### Naming rules

Filenames are `kebab-case`; exported identifiers are descriptive `PascalCase` arrow functions assigned to a `const` (no `function` declarations):

```txt
login-form.tsx          → export const LoginForm = () => { … }
dashboard-overview.tsx  → export const DashboardOverview = () => { … }
```

Avoid vague names (`form.tsx`, `card.tsx`, `section.tsx`) and PascalCase filenames. Avoid barrel `index.ts` files.

## Adding a feature

1. New oRPC procedure in `packages/api/src/routers/`.
2. New route under `src/routes/` consuming it via the typed client.
3. UI components under `@/components/<feature>/`, hooks under `@/hooks/<feature>/`; the route fetches data via `useQuery` and passes it down.
4. Use primitives from `@freenary/ui`; add a shadcn primitive there if missing rather than reinventing it.

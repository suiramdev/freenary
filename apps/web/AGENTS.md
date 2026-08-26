# `apps/web`

## Stack

- **Vite** dev server (`bun run dev:web`, port 3001).
- **TanStack Start** on **Vite** — SSR framework with TanStack Router, file-based routing in `src/routes/`.
- **TanStack Query** + `@orpc/tanstack-query` — typed queries derived from the server router type.
- **Better Auth** client for sessions; auth state syncs with `apps/server`.
- **shadcn/ui primitives** from `@freenary/ui` — do not duplicate components locally.
- **Tailwind v4** via `@tailwindcss/vite`; `src/index.css` imports the tokens from `@freenary/ui/globals.css`.

## Layout

```
src/
  router.tsx      # TanStack Router setup (routeTree.gen)
  index.css       # Imports @freenary/ui/globals.css
  routes/         # File-based routes (pages own data fetching)
    __root.tsx    # Root layout (providers, header, Toaster)
    _auth/        # Auth-guarded route group
  components/     # App-specific components (sign-in-form, header, etc.)
  hooks/          # App-specific hooks
  utils/          # oRPC client + query client (orpc.ts)
  middleware/     # Server middleware (auth guard)
  functions/      # Server functions (get-user)
  lib/            # Client helpers (auth-client, utils)
```

## Conventions

- Shared primitives live in `packages/ui`. Import as `@freenary/ui/components/button`. Add app-specific blocks here only when they are not reusable.
- API types: import the **router type** from `@freenary/api`, never the implementation. The oRPC client provides full inference.
- Client env vars must be prefixed `VITE_` and declared in `@freenary/env/src/web.ts`.
- Follow the Ultracite + React rules in the root `AGENTS.md` — no class components, hooks at top level, semantic HTML.
- Filenames are `kebab-case` (e.g. `sign-in-form.tsx`); components are arrow functions assigned to a `const` (`export const SignInForm = () => { … }`), never `function` declarations.

## Data fetching

Route files in `src/routes/` own `useQuery` calls. Section-level components receive data as props — they are presentation-focused and must **not** fetch their own data.

Exceptions:
- Interactive, lazily-triggered queries (search-as-you-type, dialog-scoped polling).
- Mutations (`useMutation`/`useQueryClient` invalidation) stay in the component or hook that triggers them.

## Adding a feature

1. New oRPC procedure in `packages/api/src/routers/`.
2. New route under `src/routes/` consuming it via the typed client.
3. UI components under `src/components/`; the route fetches data via `useQuery` and passes it down.
4. Use primitives from `@freenary/ui`; add a shadcn primitive there if missing rather than reinventing it.

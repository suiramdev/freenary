# `apps/web`

## Stack

- **Vite** dev server (`bun run dev:web`, port `WEB_PORT` or 5173). The `dev` script compiles Paraglide **before** Vite starts, and `compose.dev.yml` keeps `web/src/paraglide/` out of its watch sync: Vite caches the first failed resolution of `@/paraglide/server.js`, so a generated directory that appears (or is deleted) after startup turns every SSR request into a permanent 500 until the process restarts.
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

## Conventions

- Shared primitives live in `packages/ui`. Import as `@freenary/ui/components/button`. Add app-specific blocks here only when they aren't reusable.
- **Every user-facing string is a message key.** Adding or changing UI means adding or updating entries in `messages/en.json` _and_ `messages/fr.json` in the same change — see [Internationalization](#internationalization).
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

### Rendering

**Routes render on the server.** The only route that opts out is `callback/$provider`, whose code exchange needs the session cookie the browser holds. Everything else ships real markup in the first response — the sidebar, the header, section titles and descriptions, and any control that needs no data.

The session lives on the API's own origin, so it is unreadable during SSR. Access rules therefore run in `AuthGate` (`@/components/auth/auth-gate.tsx`), never in a route's `beforeLoad`: a `beforeLoad` that awaits the session forces the whole subtree client-only and blanks the shell with it. Give the gate an `audience` (`guest`, `member`, `onboarding`) rather than reimplementing the redirects.

There is no router-level pending component. A route that swaps its whole page for a placeholder is a bug — see “Loading states”.

### Data fetching

Section-level (organism-scale) components are presentation-focused and must **not** fetch their own data. `useQuery` calls belong at the page level — the route files in `src/routes/` — with results passed down as props (including `isPending` flags when the component renders loading states).

Exceptions that may keep queries local:

- Interactive, lazily-triggered queries (search-as-you-type, dialog-scoped OAuth polling) where page-level fetching makes no sense.
- Mutations (`useMutation`/`useQueryClient` invalidation) stay in the component or hook that triggers them.

### Loading states

**Data that is loading is a skeleton, never a spinner.** Anything whose content arrives from a query — a section on first paint, a list, a field filled from the server — renders a skeleton the same shape and size as the thing it stands in for, so what arrives lands where the placeholder was instead of shoving the page down. A spinner is a different size from the content that replaces it, which is exactly the jump a skeleton exists to prevent.

**A skeleton stands in for one component, never for a page.** Only the parts actually waiting on a query get one; the section around them — card, title, description, header action — renders for real from the first byte. A page-shaped skeleton throws away everything the server already rendered and makes a settled layout look like it is still arriving.

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

## The avatar

The brand mark is a procedural piggy bank, not an asset: a teal sphere with two eyes and a coin slot, drawn from numbers so it can change expression and be animated. It is also the face the assistant is meant to wear, so treat the expression set as a shared vocabulary rather than as sidebar decoration.

```txt
@/lib/avatar/geometry.ts       # sphere projection + SVG path builders (pure, no React)
@/lib/avatar/expressions.ts    # AVATAR_EXPRESSIONS, blending, the blink overlay
@/lib/avatar/animations.ts     # AVATAR_ANIMATIONS: expression steps with hold + transition
@/lib/avatar/shading.ts        # AVATAR_SHADING: the sphere's lighting, shared with the favicon
@/components/shared/freenary-avatar.tsx   # the renderer
@/components/shared/sidebar-brand.tsx     # the shell's mark, greeting on hover and focus
```

Every feature is a rounded rectangle laid on the sphere's surface and projected, which is why eyes bulge towards the centre and the slot arches across the crown. Adding a feature means adding a `SurfaceFeature`, never hand-written path data. `avatarPaths` returns paths that fully describe the mark — an expression's `roll` is folded into the projection rather than left to the caller as a `rotate()`, so a second consumer cannot draw it upright by forgetting.

**Expressions are numbers, and animations are lists of expressions.** A new expression is an entry in `AVATAR_EXPRESSIONS`; a new performance is an entry in `AVATAR_ANIMATIONS` naming existing expressions. Nothing else needs to change, and the renderer blends between whatever it is given — including mid-animation, so an interrupted hover picks up from where it stopped rather than snapping.

`<FreenaryAvatar>` owns the frame loop and writes `d` attributes directly, bypassing React: paths are recomputed per frame, so re-rendering them from React would fight the loop. A render still re-applies the resting paths, which is why the live frame is written back in a layout effect before the browser paints. Under `prefers-reduced-motion` an animation jumps straight to its final expression — no coin, no tilt, no blinking.

**The favicon is generated from the same modules.** `bun run favicon` in `apps/web` rewrites `public/favicon.svg` from the `neutral` expression, taking geometry from `avatarPaths` and lighting from `AVATAR_SHADING`, so retuning either cannot leave the tab icon behind. Colors are the one duplication: literal in the script because theme tokens do not exist in a favicon, mirroring `--avatar-*` in `@freenary/ui` — change one and change the other. `public/favicon.png` is the 32px raster fallback for browsers that ignore SVG favicons, and the script rewrites it only when `rsvg-convert` or `resvg` is on PATH.

## Internationalization

**Every user-facing string goes through [Paraglide](https://paraglidejs.com), and adding UI means adding catalog entries in the same change.** A literal string in JSX is a bug rather than a shortcut: it shows English to French readers and never reaches the switcher. Catalogs live in `messages/en.json` and `messages/fr.json` — flat, alphabetically sorted, `en.json` is the reference — and `project.inlang/settings.json` lists the locales. The Vite plugin compiles them into `src/paraglide/`, which is generated and never committed.

```tsx
import { m } from "@/paraglide/messages.js";

<h1>{m.budget_page_title()}</h1>
<p>{m.bank_synced_at({ date })}</p>
```

**What counts as user-facing** is wider than visible text. All of these need a key: button and link labels, headings and body copy, `placeholder`, `title`, `alt`, `aria-label` and `sr-only` text, empty and error states, tooltips, toast messages on both success and failure, and Zod validation messages. What does _not_: values from the bank, the provider or the user; slugs and enums `packages/api` owns (translate those through a table — see below); log lines, comments and test fixtures.

Keys are `snake_case`, prefixed by feature (`budget_`, `settings_`, `bank_`, `nav_`, …), and named for meaning rather than for the English wording. A sentence is one parameterized message, never two messages concatenated. Counts use the message format's plural variants so CLDR picks the branch — French takes the singular at zero, English does not.

**Both catalogs move together.** A key present in `en.json` and missing from `fr.json` compiles with no error and no warning — the generated module aliases the French branch to the English one, so English silently leaks into a French page. Nothing in the build catches it; the only guard is adding both entries at once. Changing wording means editing the catalogs, not the JSX, and a change of _meaning_ takes a new key rather than a redefinition of the old one, because the existing translation is now wrong.

**Never call `m.*()` or `getLocale()` at module scope.** Routes render on the server, where a module is evaluated once per process: an evaluated string would pin the first request's locale and serve it to everyone after. A module-level table holds the message _function_ (`label: m.nav_home`) and the use site calls it — see `src/lib/nav-items.ts`.

Locale-sensitive formatting takes the locale explicitly. `Intl.NumberFormat(undefined, …)` and `toLocaleDateString(undefined, …)` mean "the JS runtime's locale", which is the server's during SSR and the browser's afterwards — pass `getLocale()`, and thread it as a parameter into pure helpers in `src/lib/` rather than reading it inside them. Search over translated text folds accents through `foldForSearch` (`src/lib/search-text.ts`).

Things that are derived, not translated: country names and their sort order come from `Intl.DisplayNames` / `Intl.Collator`, and the spending taxonomy's names come from `src/lib/taxonomy-labels.ts`, keyed by the slugs `packages/api` owns. Values from the bank or from the user are never translated.

`@freenary/ui` primitives carry their own accessible names for controls with no visible text ("Toggle sidebar", "Loading"). They read them from `UiLabelsProvider` (`@freenary/ui/lib/labels`), which `src/routes/__root.tsx` fills; the English defaults keep the package usable on its own.

**Adding a locale:** add `messages/<code>.json`, list the code in `project.inlang/settings.json`, and give it an endonym in `src/lib/i18n.ts`. The switcher picks it up everywhere on its own.

## Adding a feature

1. New oRPC procedure in `packages/api/src/routers/`.
2. New route under `src/routes/` consuming it via the typed client.
3. UI components under `@/components/<feature>/`, hooks under `@/hooks/<feature>/`; the route fetches data via `useQuery` and passes it down.
4. Use primitives from `@freenary/ui`; add a shadcn primitive there if missing rather than reinventing it.
5. Every string the feature renders gets a key in both catalogs — see [Internationalization](#internationalization).

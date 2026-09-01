# `packages/ui` — Shared Design System

shadcn/ui primitives + Tailwind tokens reused by every React app in the monorepo (`apps/web`, and any future React surface). Centralizing them here keeps the dashboard, marketing, and future apps visually coherent.

## Layout

```
src/
  components/        # shadcn primitives (button, input, dialog, ...)
  hooks/             # Reusable React hooks
  lib/               # cn() and other tiny helpers
  styles/
    globals.css      # Tailwind v4 layer + design tokens (colors, radii, spacing)
components.json      # shadcn config for this package
postcss.config.mjs   # Re-exported as @freenary/ui/postcss.config
```

Exports (see `package.json`):

```ts
import { Button } from "@freenary/ui/components/button";
import { cn } from "@freenary/ui/lib/utils";
import "@freenary/ui/globals.css";
```

## Conventions

- **One copy of every primitive lives here.** If `apps/web` needs a Tooltip, add it here via shadcn rather than inlining it.
- **Add components with the shadcn CLI targeting this package**, run from repo root:
  ```bash
  bunx shadcn@latest add <component> -c packages/ui
  ```
- **App-specific composites** (e.g. a project-switcher built from Button + Popover + Avatar) belong in `apps/web/src/components/`, not here.
- **Design tokens** (colors, radii, font stacks) live in `src/styles/globals.css`. Change them once; every app picks them up.
- **No app imports allowed.** This package depends on React + radix-ui + Tailwind only — never on `@freenary/api`, `@freenary/db`, or any app workspace.
- **Never hardcode a user-facing string in a primitive.** Visible text arrives as `children` or a prop from the app. The accessible names for controls with no visible text — "Toggle sidebar", "Loading", "Close" — come from `useUiLabels()` (`src/lib/labels.tsx`), which an app fills via `UiLabelsProvider`; the English defaults there keep the package usable on its own. A new primitive with an `aria-label`, `sr-only` line or `alt` adds a field to `UiLabels` and reads it from the hook, so the app that speaks two languages can translate it. This package never imports Paraglide — the labels context is the seam.
- **Accessibility is non-negotiable.** Use radix-ui / shadcn primitives' built-in ARIA; follow the React + accessibility rules in the root `CLAUDE.md`.

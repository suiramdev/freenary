# `packages/ui` — Shared Design System

shadcn/ui primitives + Tailwind tokens reused by every React app in the monorepo (`apps/web`, `apps/fumadocs`). Centralizing them here keeps every surface visually coherent.

## Layout

```
src/
  components/        # shadcn primitives (button, input, dialog, skeleton, ...)
  hooks/             # Reusable React hooks
  lib/               # cn() and other tiny helpers
  styles/
    globals.css      # Tailwind v4 layer + design tokens (colors, radii, spacing)
components.json      # shadcn config for this package (style: base-mira, icon: tabler)
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
- **App-specific composites** (e.g. a dashboard widget built from Button + Card) belong in `apps/web/src/components/`, not here.
- **Design tokens** (colors, radii, font stacks) live in `src/styles/globals.css`. Change them once; every app picks them up.
- **No app imports allowed.** This package depends on React + radix-ui + Tailwind only — never on `@freenary/api`, `@freenary/db`, or any app workspace.
- **Accessibility is non-negotiable.** Use radix-ui / shadcn primitives' built-in ARIA; follow the React + accessibility rules in the root `AGENTS.md`.
- **Icon library is Tabler** (`@tabler/icons-react`), configured in `components.json`.

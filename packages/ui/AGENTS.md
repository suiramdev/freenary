# `packages/ui` — Shared Design System

shadcn/ui primitives + Tailwind tokens reused by every React app in the monorepo (`apps/web`, and any future React surface). Centralizing them here keeps the dashboard, marketing, and future apps visually coherent.

## Layout

```
src/
  components/        # shadcn primitives (button, input, dialog, ...)
  hooks/             # Reusable React hooks
  lib/               # cn() and other tiny helpers
    brand-avatar/    # The mark's morph engine — see "The Brand Avatar"
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

## The Brand Avatar

`BrandAvatar` (`src/components/brand-avatar.tsx`) is the product mark as a character. `state="logo"` draws exactly the static ring the favicon draws — the same measured proportions, the same three arcs — and every other state morphs out of it. The engine behind it lives in `src/lib/brand-avatar/` and is framework-free:

| Module | Owns |
| --- | --- |
| `math.ts` | Easings, oscillators, the irregular blink schedule. |
| `shape.ts` | The two path primitives: a closed radial blob, and a capsule whose top and bottom edges bow independently. |
| `pose.ts` | `Pose` — the avatar's whole appearance as numbers — plus the blend and the ring-band guard. |
| `states.ts` | The state library: one `(time, age) => Pose` per expression. |
| `frame.ts` | A pose turned into the exact paths, and the fixed ordered slot list a renderer draws. |
| `engine.ts` | Blends the state being left into the state being entered. |

Five rules hold this together, and each one is load-bearing:

- **No clocks below the component.** `engine.sample(t)` and `brandAvatarFrame(state, t)` are pure functions of time, which is what makes `frozenAt`, the reduced-motion still frame and a DOM-less test suite produce the same image. A state builder that reads `Date.now()` breaks all three at once.
- **A pose holds nothing but numbers.** That is why blending two states is one pass over the keys rather than a per-field special case. A colour belongs in a pose as `tintR/G/B`, never as a string.
- **Silhouette harmonics are fixed at 2, 3 and 5.** A `lobes` count as a pose field would blend to a fractional harmonic, which is no longer periodic over a full turn and kinks the seam at twelve o'clock. Add amplitude, never a count.
- **The ring band is the mark.** `resize()` scales both radii together; scaling only the outer edge eats the band. `normalizePose()` is the backstop for a state whose aperture outgrows its body.
- **An angle or a cycle counter needs a period entry.** Anything a state derives from absolute time and feeds to `sin`, `cos` or `fract` — a rotation, an orbit angle, a decor phase — grows without bound, so it goes in `BLOB_CYCLES`, `SECTOR_CYCLES` or `DECOR_CYCLES`. Without one, a transition lerps it and unwinds every turn the state has accumulated: a spinner thirty seconds in sits at 8760 degrees and would strobe two dozen times backwards on its way to rest. `rebaseCycles()` crosses that gap once, at `setState`, so the blend itself stays a plain lerp — resolving the wrap per frame instead re-rounds against a moving target and jumps most of a turn in a single frame.

The renderer patches `d` and `opacity` on a fixed set of paths instead of re-rendering, so a wall of avatars costs no React commits per frame. Adding a decoration therefore means adding a slot to `INK_SLOTS` and its static fill to `INK_STYLES` — the shape list must never change between frames.

Nothing here decides _when_ a state applies; callers pass `state`. Triggers belong to the feature that has the context, not to the mark.

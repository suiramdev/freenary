# packages/ui — agent notes

## Patch inventory

`src/components/` vendors upstream component sources. When a vendored file is
patched for this repo, record it here so the next upstream sync can re-apply
(or drop) the patch instead of silently losing it.

All rows below come from suiramdev/freenary#243: the hard-coded
`var(--focus-ring, #6B97FF)` fallback (2.80:1 on light surfaces) was replaced
with `var(--focus-ring, #4A78F0)` (at least 3:1 on every surface, light and
dark).

| File | Patch |
| --- | --- |
| `src/components/banner.tsx` | 1 fallback updated (line 555) |
| `src/components/button.tsx` | 1 fallback updated (line 34) |
| `src/components/calendar.tsx` | 1 fallback updated (line 773) |
| `src/components/card.tsx` | 4 fallbacks updated (lines 398, 406, 535, 1029) |
| `src/components/combobox.tsx` | 2 fallbacks updated (lines 454, 730) |
| `src/components/date-picker-core.tsx` | 4 fallbacks updated (lines 626, 963, 1349, 1718) |
| `src/components/dropdown.tsx` | 1 fallback updated (line 245) |
| `src/components/input-message.tsx` | 3 fallbacks updated (lines 256, 335, 370), plus the `0 0 0 1px #6B97FF` focus box-shadow (line 653) |
| `src/components/select.tsx` | 2 fallbacks updated (lines 243, 595) |
| `src/components/sidebar-core.tsx` | 3 fallbacks updated |
| `src/components/sidebar-menu.tsx` | 2 fallbacks updated (lines 540, 1169) |
| `src/components/switch.tsx` | 1 fallback updated (line 40; lowercase `#6b97ff` in source) |
| `src/components/tabs.tsx` | 1 fallback updated (line 277) |
| `src/components/thinking-steps.tsx` | 1 fallback updated (line 85) |

## Conventions

- Focus indicators must keep at least 3:1 contrast (WCAG 2.2 non-text) against
every surface token (`--background`, `--card`, `--popover`, `--muted`,
`--sidebar`) in both the light and dark themes. The tokens live in
`src/styles/globals.css`: `--focus-ring` and `--ring` are `#4a78f0`, and the
global `:focus-visible` outline is 2px. `--fluid-accent` (`#6b97ff`) is the
brand accent, not a focus color, and was intentionally left unchanged.
- `src/lib/focus-contrast.test.ts` reads those tokens from `globals.css` and
asserts the 3:1 minimum for `--focus-ring` and `--ring` on every surface in
both themes, fails if the light `--focus-ring` goes back to `#6b97ff`, and
checks the `:focus-visible` outline is at least 2px. Run `bun test` from
`packages/ui` after any change to a surface or focus token.

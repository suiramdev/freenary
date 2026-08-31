# 003 — Animate the onboarding stepper's progress

- **Status**: DONE (implemented at 66f3199; feel check pending)
- **Commit**: 66f3199
- **Severity**: LOW
- **Category**: Missed opportunities / Physicality

## Problem

The stepper is the only thing on screen that reports progress, and the two signals that carry that meaning both snap:

```tsx
// apps/web/src/components/onboarding/onboarding-stepper.tsx:35 — current
{
  isComplete ? <Check className="size-3.5" /> : index + 1;
}
```

```tsx
// apps/web/src/components/onboarding/onboarding-stepper.tsx:46-54 — current
{
  index < steps.length - 1 && (
    <span
      aria-hidden="true"
      className={cn(
        "mx-3 h-px w-8 transition-colors sm:w-12",
        isComplete ? "bg-primary" : "bg-border"
      )}
    />
  );
}
```

The connector recolours as a whole rather than filling toward the step it leads to, and the check mark replaces the numeral in one frame.

## Target

The connector becomes a static track with a fill that scales from its left edge; the check fades and zooms in from `0.75` (never from `0` — nothing appears from nothing). Both are `transform`/`opacity` only.

```tsx
// target
<span
  aria-hidden="true"
  className="bg-border mx-3 h-px w-8 overflow-hidden sm:w-12"
>
  <span
    className={cn(
      "bg-primary block h-px w-full origin-left transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
      isComplete ? "scale-x-100" : "scale-x-0"
    )}
  />
</span>
```

```tsx
// target
{
  isComplete ? (
    <Check className="animate-in fade-in zoom-in-75 size-3.5 duration-200 ease-out motion-reduce:animate-none" />
  ) : (
    index + 1
  );
}
```

300ms for the connector fill and 200ms for the check both sit inside the sub-300ms UI budget.

## Repo conventions to follow

- `tw-animate-css` is imported in `packages/ui/src/styles/globals.css:2`; `animate-in fade-in` / `zoom-in-*` utilities are the repo's idiom for one-shot entrances — exemplar: `apps/web/src/components/shared/not-found.tsx:18-29`, and `zoom-in-95` in `packages/ui/src/components/popover.tsx:39`.
- `ease-[cubic-bezier(0.23,1,0.32,1)]` as an arbitrary Tailwind easing is already used in `packages/ui/src/components/message-scroller.tsx:101`.
- `cn` from `@freenary/ui/lib/utils` is already imported in this file.

## Steps

1. In `apps/web/src/components/onboarding/onboarding-stepper.tsx`, replace the connector `<span>` (lines 46-54) with the nested track/fill markup from **Target**, keeping the `{index < steps.length - 1 && …}` guard and `aria-hidden="true"`.
2. Replace the check/numeral expression on line 35 with the **Target** version.
3. Leave the step badge's own `transition-colors` (line 28) untouched.

## Boundaries

- Do NOT change the component's props, the `<ol>`/`<li>` structure, or any `aria-*` attribute except as shown.
- Do NOT introduce `motion/react` here — this is CSS-only, and the stepper re-renders on every step change.
- Do NOT add dependencies.
- If the code no longer matches these excerpts, STOP and report.

## Verification

- **Mechanical**: `bun run check-types` passes; `bun x ultracite check` reports no new findings for `onboarding-stepper.tsx`.
- **Feel check**: run the stack, reach onboarding with the bank step available:
  - Pressing `Continue` fills the connector left→right toward the bank step; pressing `Back` empties it right→left.
  - The check mark grows in from slightly smaller, never from nothing.
  - The connector's grey track stays visible behind the unfilled portion.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: the fill and the check switch instantly, with no movement.
- **Done when**: the stepper reads as progress rather than as a recolour.

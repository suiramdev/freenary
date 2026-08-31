# 001 — Animate the sign-in credential reveal

- **Status**: DONE (implemented at 66f3199; feel check pending)
- **Commit**: 66f3199
- **Severity**: HIGH
- **Category**: Missed opportunities / Interruptibility
- **Estimated scope**: 1 file, ~40 lines

## Problem

`apps/web/src/components/auth/auth-form.tsx` reveals the name, password and submit controls the moment the debounced email check resolves. They mount with no transition, so ~150px of form teleports into place under the email input and the panel's vertical centering jumps with it. This is the single most-seen moment of the sign-in page and it currently reads as a glitch.

```tsx
// apps/web/src/components/auth/auth-form.tsx:44 — current
{
  mode === "signup" && <form.Field name="name">…</form.Field>;
}

{
  mode !== "unknown" && <form.Field name="password">…</form.Field>;
}

{
  mode !== "unknown" && (
    <Field>
      <Button disabled={isSubmitting} type="submit">
        …
      </Button>
    </Field>
  );
}
```

It is also a _reversible_ state: `apps/web/src/hooks/auth/use-auth-form.ts:63` forces `mode` back to `"unknown"` on every keystroke that makes the field differ from the checked address, so the block appears and disappears repeatedly while someone edits their email. Anything triggered that rapidly must retarget from its current state — CSS keyframes would restart from zero each time.

## Target

One animated wrapper around all three revealed controls (never three separate ones — `mode` can only flip `signin`↔`signup` by passing through `"unknown"`, so the wrapper's contents never change while it is mounted). Height and opacity animate; the wrapper clips only while animating so the input's `ring-2` focus ring (`packages/ui/src/components/input-group.tsx:14`) is not cut off once it settles.

```tsx
// target values
const REVEAL_SPRING = { bounce: 0, duration: 0.3, type: "spring" as const };
const REVEAL_EASE = [0.23, 1, 0.32, 1] as const;

const revealTransition = {
  height: REVEAL_SPRING,
  opacity: { duration: 0.2, ease: REVEAL_EASE },
};
const collapseTransition = {
  height: REVEAL_SPRING,
  opacity: { duration: 0.12, ease: REVEAL_EASE },
};
// prefers-reduced-motion: keep the fade, drop the height movement
const reducedTransition = {
  height: { duration: 0 },
  opacity: { duration: 0.15, ease: REVEAL_EASE },
};
```

The wrapper must sit **outside** `FieldGroup`: `FieldGroup` is `flex flex-col gap-4` (`packages/ui/src/components/field.tsx:43`), and a zero-height child still consumes that 16px gap — which then vanishes in one frame when the element finally unmounts. Instead, put the revealed controls in their own `FieldGroup className="pt-4"` so the gap grows and shrinks with the reveal.

## Repo conventions to follow

- `motion` v13 is already a dependency of `apps/web`; import from `motion/react`.
- Exemplar for an `AnimatePresence` reveal, the spring shape and the module-level transition constant: `apps/web/src/components/settings/unsaved-changes-bar.tsx:14-36` (`const spring = { bounce: 0, duration: 0.3, type: "spring" as const }`).
- The strong ease-out curve `cubic-bezier(0.23, 1, 0.32, 1)` is already used in `packages/ui/src/components/message-scroller.tsx:101`. There is no `--ease-*` token file in this repo — do not create one for this plan.
- Props on JSX elements are ordered with event handlers last (see `apps/web/src/components/auth/auth-form-field.tsx:41-50`).

## Steps

1. In `apps/web/src/components/auth/auth-form.tsx`, add `import { AnimatePresence, motion, useReducedMotion } from "motion/react";` below the `@freenary/ui` imports (the repo groups external packages first, `@/` imports after — see `apps/web/src/components/settings/unsaved-changes-bar.tsx:1-4`).
2. Above the component, add the module-level constants `REVEAL_SPRING`, `REVEAL_EASE`, `revealTransition`, `collapseTransition` and `reducedTransition` exactly as written in **Target**.
3. In the component body add `const prefersReducedMotion = useReducedMotion();` after the `useAuthForm()` destructure.
4. Close the existing `<FieldGroup>` right after the `email` `form.Field` block (line 42's `</form.Field>`), so it wraps the email field only.
5. After that `</FieldGroup>`, still inside `<form>`, add:

   ```tsx
   <AnimatePresence initial={false}>
     {mode !== "unknown" && (
       <motion.div
         key="credentials"
         // Clip only while the height animates: the input's focus ring sits
         // 2px outside the box and would be cut off by a permanent clip.
         animate={{
           height: "auto",
           opacity: 1,
           transitionEnd: { overflow: "visible" },
         }}
         exit={{ height: 0, opacity: 0, overflow: "hidden" }}
         initial={{ height: 0, opacity: 0, overflow: "hidden" }}
         transition={
           prefersReducedMotion ? reducedTransition : revealTransition
         }
       >
         <FieldGroup className="pt-4">
           {/* name field (only when mode === "signup"), password field,
               submit Field — moved verbatim from their current position */}
         </FieldGroup>
       </motion.div>
     )}
   </AnimatePresence>
   ```

6. Move the existing `name`, `password` and submit-button JSX inside that new `FieldGroup`, unchanged except that the two outer `{mode !== "unknown" && …}` guards are dropped (the `AnimatePresence` child now carries that condition). Keep the `{mode === "signup" && …}` guard on the name field.
7. Give the exit its faster fade by adding `transition: prefersReducedMotion ? reducedTransition : collapseTransition` inside the `exit` object.

## Boundaries

- Do NOT touch `apps/web/src/hooks/auth/use-auth-form.ts` — the mode state machine is correct as-is.
- Do NOT touch `auth-form-field.tsx`, `auth-panel.tsx`, `auth-header.tsx`, or `auth-showcase-panel.tsx`.
- Do NOT add `autoFocus` or any focus management; this plan is motion only.
- Do NOT add dependencies (`motion` is already installed).
- Do NOT animate `width`, `margin` or `padding`. Animating `height` here is a deliberate exception — it is the only way to avoid the layout jump, and the subtree is three inputs.
- If the code no longer matches these excerpts, STOP and report.

## Verification

- **Mechanical**: `bun run check-types` passes; `bun x ultracite check` reports no new findings for `apps/web/src/components/auth/auth-form.tsx`.
- **Feel check**: run `bun run dev:web`, open `/login`, type a known address:
  - The password block grows out from under the email field; nothing teleports.
  - Delete a character: the block collapses, and typing the character back **retargets mid-collapse** — it never restarts from zero height.
  - Once the reveal settles, focus the password input: the focus ring is fully visible on all four sides (not clipped).
  - DevTools → Animations at 10% playback: the fade finishes slightly before the height settles; nothing overshoots or bounces.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: the block appears at full height immediately, still fading in.
- **Done when**: the reveal and collapse are both smooth, interruptible mid-flight, and leave no residual gap under the email field when collapsed.

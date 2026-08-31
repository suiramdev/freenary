# 002 — Animate the onboarding step and skeleton swaps

- **Status**: DONE (implemented at 66f3199; feel check pending)
- **Commit**: 66f3199
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Cohesion
- **Estimated scope**: 3 files, ~60 lines

## Problem

`apps/web/src/components/onboarding/onboarding-wizard.tsx:59-86` swaps three distinct screens with bare ternaries — skeleton → wizard, and country step ↔ bank step. Every swap is an instant teleport in a vertically centered column, so the whole panel jumps. Onboarding is a first-run, once-per-account flow: it is exactly where the delight budget is allowed to be spent, and it currently spends none.

```tsx
// apps/web/src/components/onboarding/onboarding-wizard.tsx:59-86 — current
{isPending ? (
  <OnboardingWizardSkeleton />
) : (
  <>
    <OnboardingStepper current={step} steps={hasBankStep ? STEPS : STEPS_WITHOUT_BANKING} />
    {step === 0 ? (
      <CountrySelectionStep … />
    ) : (
      <BankConnectionStep … />
    )}
  </>
)}
```

There is also no notion of direction: `Continue` and `Back` (`apps/web/src/hooks/onboarding/use-onboarding-wizard.ts:50-65,86`) produce the same instant swap, so nothing tells the user whether they moved forward or back.

## Target

Two `AnimatePresence` boundaries, both `mode="popLayout"` so the outgoing screen is taken out of flow and the incoming one lands in place immediately — no empty frame between them, which `mode="wait"` would produce in a centered column. The overlapping crossfade is masked with a short `blur(4px)`, and the step swap carries a 16px directional slide.

```tsx
// target values
const STEP_SHIFT_PX = 16;
const STEP_EASE = [0.23, 1, 0.32, 1] as const;
const STEP_ENTER = { duration: 0.22, ease: STEP_EASE };
const STEP_EXIT = { duration: 0.15, ease: STEP_EASE };
const FADE = { duration: 0.2, ease: STEP_EASE };

interface StepMotion {
  direction: 1 | -1;
  /** 0 under prefers-reduced-motion: fade only, no travel, no blur. */
  shift: number;
}

const stepVariants = {
  center: { filter: "blur(0px)", opacity: 1, transition: STEP_ENTER, x: 0 },
  enter: ({ direction, shift }: StepMotion) => ({
    filter: shift ? "blur(4px)" : "blur(0px)",
    opacity: 0,
    x: direction * shift,
  }),
  exit: ({ direction, shift }: StepMotion) => ({
    filter: shift ? "blur(4px)" : "blur(0px)",
    opacity: 0,
    transition: STEP_EXIT,
    x: -direction * shift,
  }),
};
```

The stepper stays **outside** the animated step body so it does not slide with the content and its `transition-colors` progress actually plays (plan 003 builds on this).

## Repo conventions to follow

- `motion` v13 is already a dependency of `apps/web`; import from `motion/react`.
- Exemplar for `AnimatePresence` + blur-masked motion + a module-level transition constant: `apps/web/src/components/settings/unsaved-changes-bar.tsx:14-36` (it uses `filter: "blur(4px)"` for exactly this masking purpose).
- `cubic-bezier(0.23, 1, 0.32, 1)` is the repo's strong ease-out — see `packages/ui/src/components/message-scroller.tsx:101`.
- `OnboardingWizard` is a presentational arrow component fed entirely by props from `apps/web/src/routes/onboarding.tsx:32-48`; new state belongs in `useOnboardingWizard`, not in the component.

## Steps

1. In `apps/web/src/hooks/onboarding/use-onboarding-wizard.ts`, add `const [direction, setDirection] = useState<1 | -1>(1);` next to the existing `step` state (line 22).
2. In `handleCountryContinue` (line 50), call `setDirection(1);` immediately before `setStep(1);`.
3. Replace `handleBack: () => setStep(0),` (line 86) with a named handler defined above the return:
   ```ts
   const handleBack = () => {
     setDirection(-1);
     setStep(0);
   };
   ```
   and return `handleBack` plus `direction` from the hook (keep the returned object alphabetically ordered as it is today).
4. In `apps/web/src/routes/onboarding.tsx`, pass `direction={wizard.direction}` to `<OnboardingWizard …>` (props there are alphabetically ordered — put it after `country`).
5. In `apps/web/src/components/onboarding/onboarding-wizard.tsx`:
   - `import { AnimatePresence, motion, useReducedMotion } from "motion/react";`
   - Add `direction: 1 | -1;` to `OnboardingWizardProps` (alphabetical order, after `country`).
   - Add the constants and `stepVariants` from **Target** at module level.
   - Convert the component from an implicit-return arrow to a block body so it can call `const prefersReducedMotion = useReducedMotion();`, and compute `const stepMotion = { direction, shift: prefersReducedMotion ? 0 : STEP_SHIFT_PX };`
   - Add `relative` to the `className` of the column div on line 58 (`flex w-full max-w-md flex-col gap-8` → `relative flex w-full max-w-md flex-col gap-8`) — `mode="popLayout"` positions exiting children absolutely against it.
6. Replace the body of that column with:

   ```tsx
   <AnimatePresence initial={false} mode="popLayout">
     {isPending ? (
       <motion.div
         key="skeleton"
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         initial={{ opacity: 0 }}
         transition={FADE}
       >
         <OnboardingWizardSkeleton />
       </motion.div>
     ) : (
       <motion.div
         key="wizard"
         animate={{ opacity: 1 }}
         className="flex flex-col gap-8"
         exit={{ opacity: 0 }}
         initial={{ opacity: 0 }}
         transition={FADE}
       >
         <OnboardingStepper
           current={step}
           steps={hasBankStep ? STEPS : STEPS_WITHOUT_BANKING}
         />
         <AnimatePresence custom={stepMotion} initial={false} mode="popLayout">
           <motion.div
             key={step}
             animate="center"
             custom={stepMotion}
             exit="exit"
             initial="enter"
             variants={stepVariants}
           >
             {step === 0 ? (
               <CountrySelectionStep … />   /* props unchanged */
             ) : (
               <BankConnectionStep … />     /* props unchanged */
             )}
           </motion.div>
         </AnimatePresence>
       </motion.div>
     )}
   </AnimatePresence>
   ```

   Keep every existing prop passed to the two step components exactly as it is today.

## Boundaries

- Do NOT change any step component's internals (`country-selection-step.tsx`, `bank-connection-step.tsx`, `country-option.tsx`, `onboarding-wizard-skeleton.tsx`).
- Do NOT touch `onboarding-stepper.tsx` — that is plan 003.
- Do NOT add a `layout` prop anywhere: layout projection transform-scales the subtree and visibly squishes the country list's text mid-animation.
- Do NOT change onboarding persistence, completion, or sign-out behaviour in `use-onboarding-wizard.ts` beyond the direction state.
- Do NOT add dependencies.
- If the code no longer matches these excerpts, STOP and report.

## Verification

- **Mechanical**: `bun run check-types` passes; `bun x ultracite check` reports no new findings for the three touched files.
- **Feel check**: run the stack, sign in as a user who has not onboarded:
  - Skeleton → wizard is a crossfade with no empty frame and no flash.
  - `Continue` slides the bank step in from the right while the country step leaves to the left; `Back` reverses both directions.
  - The stepper does not slide — only the step body moves.
  - Press `Continue` and `Back` in quick succession: no stacked or orphaned screens, no scrollbar flicker.
  - DevTools → Animations at 10%: the blur is gone by the time the incoming step reaches full opacity; text is never legibly double-exposed.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`: steps crossfade in place with no slide and no blur.
- **Done when**: no swap in the onboarding flow teleports, and direction is readable from the motion alone.

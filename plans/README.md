# Animation plans

Written by the `improve-animations` skill against commit `66f3199`.

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-auth-form-credential-reveal.md) | Animate the sign-in credential reveal | HIGH | DONE |
| [002](002-onboarding-step-transitions.md) | Animate the onboarding step and skeleton swaps | MEDIUM | DONE |
| [003](003-onboarding-stepper-progress.md) | Animate the onboarding stepper's progress | LOW | DONE |

## Order and dependencies

1. **001** is independent — it touches only `apps/web/src/components/auth/`.
2. **002** before **003**: 002 moves the stepper out of the animated step body, which is what lets 003's connector fill and check-mark animations play at all instead of being remounted on every step change.

## Shared values

Both 001 and 002 use the repo's existing motion vocabulary rather than new tokens: the spring `{ bounce: 0, duration: 0.3, type: "spring" }` from `apps/web/src/components/settings/unsaved-changes-bar.tsx:14`, and the strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` from `packages/ui/src/components/message-scroller.tsx:101`. There is no `--ease-*` token layer in this codebase; introducing one is out of scope for these plans.

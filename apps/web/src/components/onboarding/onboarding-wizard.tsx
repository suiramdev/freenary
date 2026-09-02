import { Button } from "@freenary/ui/components/button";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { BankConnectionStep } from "@/components/onboarding/bank-connection-step";
import { CountrySelectionStep } from "@/components/onboarding/country-selection-step";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingWizardSkeleton } from "@/components/onboarding/onboarding-wizard-skeleton";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import type { BankInstitution } from "@/hooks/bank/use-bank-connections";
import { m } from "@/paraglide/messages.js";

// Held as message functions, not strings: a module-level `m.x()` would freeze
// the label in whichever locale rendered first, and on the server that locale
// belongs to a single request.
const STEPS = [m.onboarding_step_country, m.onboarding_step_bank] as const;
const STEPS_WITHOUT_BANKING = [m.onboarding_step_country] as const;

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

// Blur masks the moment both steps overlap; without it the crossfade
// double-exposes two blocks of text.
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

interface OnboardingWizardProps {
  banks: BankInstitution[];
  /** Banks linked so far, counted from the connections the server holds. */
  connectedCount: number;
  country: string | null;
  direction: 1 | -1;
  hasBankStep: boolean;
  isBanksError: boolean;
  isBanksPending: boolean;
  isCompleting: boolean;
  isPending: boolean;
  onBack: () => void;
  onCountryContinue: () => void;
  onCountrySelect: (country: string) => void;
  onFinish: () => void;
  onSignOut: () => void;
  step: number;
}

export const OnboardingWizard = ({
  banks,
  connectedCount,
  country,
  direction,
  hasBankStep,
  isBanksError,
  isBanksPending,
  isCompleting,
  isPending,
  onBack,
  onCountryContinue,
  onCountrySelect,
  onFinish,
  onSignOut,
  step,
}: OnboardingWizardProps) => {
  const prefersReducedMotion = useReducedMotion();
  const stepMotion: StepMotion = {
    direction,
    shift: prefersReducedMotion ? 0 : STEP_SHIFT_PX,
  };

  return (
    <main className="bg-background flex min-h-svh flex-col">
      <div className="flex items-center justify-end gap-1 px-4 py-3">
        <ThemeSwitcher />
        <LocaleSwitcher />
        <Button onClick={onSignOut} type="button" variant="ghost">
          {m.account_sign_out()}
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        {/* popLayout takes the outgoing screen out of flow, so the incoming one
            lands in place instead of leaving an empty frame behind. */}
        <div className="relative flex w-full max-w-md flex-col gap-8">
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
                {/* Outside the step swap: the stepper stays put and its own
                    colour transition reports the progress. */}
                <OnboardingStepper
                  current={step}
                  steps={hasBankStep ? STEPS : STEPS_WITHOUT_BANKING}
                />
                <AnimatePresence
                  custom={stepMotion}
                  initial={false}
                  mode="popLayout"
                >
                  <motion.div
                    key={step}
                    animate="center"
                    custom={stepMotion}
                    exit="exit"
                    initial="enter"
                    variants={stepVariants}
                  >
                    {step === 0 ? (
                      <CountrySelectionStep
                        isCompleting={isCompleting}
                        onContinue={onCountryContinue}
                        onSelect={onCountrySelect}
                        selected={country}
                      />
                    ) : (
                      <BankConnectionStep
                        banks={banks}
                        connectedCount={connectedCount}
                        isBanksError={isBanksError}
                        isBanksPending={isBanksPending}
                        isCompleting={isCompleting}
                        onBack={onBack}
                        onFinish={onFinish}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
};

import { Button } from "@freenary/ui/components/button";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { BankConnectionStep } from "@/components/onboarding/bank-connection-step";
import { CountrySelectionStep } from "@/components/onboarding/country-selection-step";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingWizardSkeleton } from "@/components/onboarding/onboarding-wizard-skeleton";
import { ShaderBackground } from "@/components/shared/shader-background";
import type { BankInstitution } from "@/hooks/bank/use-bank-connections";

const STEPS = ["Country", "Bank connection"] as const;
const STEPS_WITHOUT_BANKING = ["Country"] as const;

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
    <main className="bg-background relative flex min-h-svh flex-col">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <ShaderBackground />
      </div>
      <div className="relative z-10 flex items-center justify-end px-4 py-3">
        <Button onClick={onSignOut} type="button" variant="ghost">
          Sign out
        </Button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
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

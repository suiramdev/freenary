import { Button } from "@freenary/ui/components/button";
import { spring } from "@freenary/ui/lib/springs";
import { SURFACE_BG } from "@freenary/ui/lib/surface-classes";
import { SurfaceProvider } from "@freenary/ui/lib/surface-context";
import { cn } from "@freenary/ui/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { BankInstitution } from "@/features/bank-connection";
import { m } from "@/paraglide/messages.js";
import { LocaleSwitcher } from "@/shared/ui/locale-switcher";
import { ThemeSwitcher } from "@/shared/ui/theme-switcher";

import { BankConnectionStep } from "./bank-connection-step";
import { CountrySelectionStep } from "./country-selection-step";
import { OnboardingStepper } from "./onboarding-stepper";
import { OnboardingWizardSkeleton } from "./onboarding-wizard-skeleton";

interface StepMotion {
  direction: 1 | -1;
  shift: number;
}

interface OnboardingWizardProps {
  banks: BankInstitution[];
  connectedCount: number;
  direction: 1 | -1;
  hasBankStep: boolean;
  isBanksError: boolean;
  isBanksPending: boolean;
  isCompleting: boolean;
  isPending: boolean;
  onBack: () => void;
  onCountriesChange: (countries: string[]) => void;
  onCountryContinue: () => void;
  onFinish: () => void;
  onSignOut: () => void;
  step: number;
  taxCountries: string[];
  unavailableCountries: string[];
}

const STEP_LABEL_FNS = [
  m.onboarding_step_country,
  m.onboarding_step_bank,
] as const satisfies readonly (() => string)[];
const STEP_LABEL_FNS_WITHOUT_BANKING = [
  m.onboarding_step_country,
] as const satisfies readonly (() => string)[];

const STEP_SHIFT_PX = 16;
const NO_STEP_SHIFT_PX = 0;
const STEP_CROSSFADE_MASK_BLUR = "blur(4px)";
const NO_BLUR = "blur(0px)";

const stepVariants = {
  center: { filter: NO_BLUR, opacity: 1, transition: spring.slow, x: 0 },
  enter: ({ direction, shift }: StepMotion) => ({
    filter: shift ? STEP_CROSSFADE_MASK_BLUR : NO_BLUR,
    opacity: 0,
    x: direction * shift,
  }),
  exit: ({ direction, shift }: StepMotion) => ({
    filter: shift ? STEP_CROSSFADE_MASK_BLUR : NO_BLUR,
    opacity: 0,
    transition: spring.slow.exit,
    x: -direction * shift,
  }),
};

export const OnboardingWizard = ({
  banks,
  connectedCount,
  direction,
  hasBankStep,
  isBanksError,
  isBanksPending,
  isCompleting,
  isPending,
  onBack,
  onCountriesChange,
  onCountryContinue,
  onFinish,
  onSignOut,
  step,
  taxCountries,
  unavailableCountries,
}: OnboardingWizardProps) => {
  const prefersReducedMotion = useReducedMotion();
  const stepMotion: StepMotion = {
    direction,
    shift: prefersReducedMotion ? NO_STEP_SHIFT_PX : STEP_SHIFT_PX,
  };

  return (
    <SurfaceProvider value={1}>
      <main className={cn(SURFACE_BG[1], "flex min-h-svh flex-col")}>
        <div className="flex items-center justify-end gap-1 px-4 py-3">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <Button onClick={onSignOut} type="button" variant="ghost">
            {m.account_sign_out()}
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="relative flex w-full max-w-md flex-col gap-8">
            <AnimatePresence initial={false} mode="popLayout">
              {isPending ? (
                <motion.div
                  key="skeleton"
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  transition={spring.moderate}
                  exit={{ opacity: 0, transition: spring.moderate.exit }}
                >
                  <OnboardingWizardSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key="wizard"
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-8"
                  initial={{ opacity: 0 }}
                  transition={spring.moderate}
                  exit={{ opacity: 0, transition: spring.moderate.exit }}
                >
                  <OnboardingStepper
                    current={step}
                    steps={
                      hasBankStep
                        ? STEP_LABEL_FNS
                        : STEP_LABEL_FNS_WITHOUT_BANKING
                    }
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
                          onCountriesChange={onCountriesChange}
                          selected={taxCountries}
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
                          unavailableCountries={unavailableCountries}
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
    </SurfaceProvider>
  );
};

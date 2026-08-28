import { Button } from "@freenary/ui/components/button";

import { BankConnectionStep } from "@/components/onboarding/bank-connection-step";
import type { OnboardingBank } from "@/components/onboarding/bank-list";
import { CountrySelectionStep } from "@/components/onboarding/country-selection-step";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingWizardSkeleton } from "@/components/onboarding/onboarding-wizard-skeleton";
import { ShaderBackground } from "@/components/shared/shader-background";

const STEPS = ["Country", "Bank connection"] as const;
const STEPS_WITHOUT_BANKING = ["Country"] as const;

interface OnboardingWizardProps {
  banks: OnboardingBank[];
  connectedBanks: ReadonlySet<string>;
  country: string | null;
  hasBankStep: boolean;
  isBanksError: boolean;
  isBanksPending: boolean;
  isCompleting: boolean;
  isPending: boolean;
  onBack: () => void;
  onBankConnected: (bankName: string) => void;
  onCountryContinue: () => void;
  onCountrySelect: (country: string) => void;
  onFinish: () => void;
  onSignOut: () => void;
  step: number;
}

export const OnboardingWizard = ({
  banks,
  connectedBanks,
  country,
  hasBankStep,
  isBanksError,
  isBanksPending,
  isCompleting,
  isPending,
  onBack,
  onBankConnected,
  onCountryContinue,
  onCountrySelect,
  onFinish,
  onSignOut,
  step,
}: OnboardingWizardProps) => (
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
      <div className="flex w-full max-w-md flex-col gap-8">
        {isPending ? (
          <OnboardingWizardSkeleton />
        ) : (
          <>
            <OnboardingStepper
              current={step}
              steps={hasBankStep ? STEPS : STEPS_WITHOUT_BANKING}
            />
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
                connected={connectedBanks}
                country={country ?? ""}
                isBanksError={isBanksError}
                isBanksPending={isBanksPending}
                isCompleting={isCompleting}
                onBack={onBack}
                onConnected={onBankConnected}
                onFinish={onFinish}
              />
            )}
          </>
        )}
      </div>
    </div>
  </main>
);

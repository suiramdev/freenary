import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import { ArrowLeftIcon } from "@phosphor-icons/react";

import { BankConnectionPanel } from "@/components/bank/bank-connection-panel";
import { OnboardingStepHeader } from "@/components/onboarding/onboarding-step-header";
import type { BankInstitution } from "@/hooks/bank/use-bank-connections";

interface BankConnectionStepProps {
  banks: BankInstitution[];
  connectedCount: number;
  isBanksError: boolean;
  isBanksPending: boolean;
  isCompleting: boolean;
  onBack: () => void;
  onFinish: () => void;
}

export const BankConnectionStep = ({
  banks,
  connectedCount,
  isBanksError,
  isBanksPending,
  isCompleting,
  onBack,
  onFinish,
}: BankConnectionStepProps) => (
  <div className="flex flex-col gap-6">
    <OnboardingStepHeader
      description="Connect your bank accounts to import transactions and balances. You can always do this later from Settings."
      title="Connect your bank"
    />
    <BankConnectionPanel
      banks={banks}
      isBanksError={isBanksError}
      isBanksPending={isBanksPending}
      returnTo="onboarding"
    />
    <div className="flex items-center justify-between gap-3">
      <Button onClick={onBack} type="button" variant="ghost">
        <ArrowLeftIcon data-icon="inline-start" />
        Back
      </Button>
      <div className="flex items-center gap-2">
        <Button onClick={onFinish} type="button" variant="secondary">
          Skip for now
        </Button>
        <Button disabled={isCompleting} onClick={onFinish} type="button">
          {isCompleting && <Spinner data-icon="inline-start" />}
          {connectedCount > 0 ? `Finish (${connectedCount})` : "Finish"}
        </Button>
      </div>
    </div>
  </div>
);

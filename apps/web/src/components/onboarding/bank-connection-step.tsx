import { Button } from "@freenary/ui/components/button";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiArrowLeftLine } from "@remixicon/react";

import { BankConnectionPanel } from "@/components/bank/bank-connection-panel";
import { OnboardingStepHeader } from "@/components/onboarding/onboarding-step-header";
import type { BankInstitution } from "@/hooks/bank/use-bank-connections";
import { m } from "@/paraglide/messages.js";

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
      description={m.onboarding_bank_description()}
      title={m.onboarding_bank_title()}
    />
    <BankConnectionPanel
      banks={banks}
      isBanksError={isBanksError}
      isBanksPending={isBanksPending}
      returnTo="onboarding"
    />
    <div className="flex items-center justify-between gap-3">
      <Button onClick={onBack} type="button" variant="ghost">
        <RiArrowLeftLine data-icon="inline-start" />
        {m.onboarding_back()}
      </Button>
      <div className="flex items-center gap-2">
        <Button onClick={onFinish} type="button" variant="secondary">
          {m.onboarding_skip()}
        </Button>
        <Button disabled={isCompleting} onClick={onFinish} type="button">
          {isCompleting && <Spinner data-icon="inline-start" />}
          {connectedCount > 0
            ? m.onboarding_finish_with_count({ count: connectedCount })
            : m.onboarding_finish()}
        </Button>
      </div>
    </div>
  </div>
);

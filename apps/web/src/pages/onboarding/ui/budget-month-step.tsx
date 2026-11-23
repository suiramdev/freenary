import { Button } from "@freenary/ui/components/button";
import { useIcon } from "@freenary/ui/lib/icon-context";
import { RiArrowRightLine } from "@remixicon/react";

import { BudgetMonthExample, BudgetMonthStartSelect } from "@/entities/budget";
import { m } from "@/paraglide/messages.js";
import { remixIcon } from "@/shared/lib/remix-icon";
import { WizardStepHeader } from "@/shared/ui/wizard";

interface BudgetMonthStepProps {
  onBack: () => void;
  onContinue: () => void;
  onStartDayChange: (startDay: number) => void;
  startDay: number;
}

export const BudgetMonthStep = ({
  onBack,
  onContinue,
  onStartDayChange,
  startDay,
}: BudgetMonthStepProps) => {
  const ArrowLeftIcon = useIcon("arrow-left");

  return (
    <div className="flex flex-col gap-6">
      <WizardStepHeader
        description={m.onboarding_budget_month_description()}
        title={m.onboarding_budget_month_title()}
      />
      <div className="flex flex-col gap-2">
        <BudgetMonthStartSelect
          onValueChange={onStartDayChange}
          value={startDay}
        />
        <BudgetMonthExample startDay={startDay} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          leadingIcon={ArrowLeftIcon}
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          {m.onboarding_back()}
        </Button>
        <Button
          onClick={onContinue}
          trailingIcon={remixIcon(RiArrowRightLine)}
          type="button"
        >
          {m.onboarding_continue()}
        </Button>
      </div>
    </div>
  );
};

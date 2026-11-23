import { Skeleton } from "@freenary/ui/components/skeleton";

import { BudgetMonthExample, BudgetMonthStartInput } from "@/entities/budget";
import { m } from "@/paraglide/messages.js";

import { useBudgetMonthSetting } from "../model/use-budget-month-setting";
import { SettingsSection } from "./settings-section";

const SELECT_SKELETON = "h-8 w-52";

const BudgetMonthAction = ({
  isSaving,
  loadError,
  save,
  startDay,
}: ReturnType<typeof useBudgetMonthSetting>) => {
  if (startDay !== undefined) {
    return (
      <BudgetMonthStartInput
        disabled={isSaving}
        onValueChange={save}
        value={startDay}
      />
    );
  }

  return loadError ? null : <Skeleton className={SELECT_SKELETON} />;
};

export const BudgetMonthSection = () => {
  const setting = useBudgetMonthSetting();
  const { startDay } = setting;

  return (
    <SettingsSection
      action={<BudgetMonthAction {...setting} />}
      description={m.settings_budget_month_description()}
      title={m.settings_budget_month_title()}
    >
      {startDay === undefined ? null : (
        <BudgetMonthExample startDay={startDay} />
      )}
    </SettingsSection>
  );
};

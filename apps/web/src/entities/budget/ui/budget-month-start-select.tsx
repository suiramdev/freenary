import {
  BUDGET_MONTH_START_DAYS,
  budgetMonthOfDay,
  isCalendarBudgetMonth,
} from "@freenary/api/lib/budget-month";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@freenary/ui/components/select";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

import { budgetMonthExample } from "../model/budget-month-label";

interface BudgetMonthStartSelectProps {
  disabled?: boolean;
  onValueChange: (startDay: number) => void;
  value: number;
}

const TRIGGER_WIDTH = "w-52";

const startDayLabel = (day: number): string =>
  isCalendarBudgetMonth(day)
    ? m.budget_month_start_calendar()
    : m.budget_month_start_day({ day });

export const BudgetMonthStartSelect = ({
  disabled,
  onValueChange,
  value,
}: BudgetMonthStartSelectProps) => (
  <Select
    disabled={disabled}
    onValueChange={(next: string) => {
      const day = Number(next);

      if (BUDGET_MONTH_START_DAYS.includes(day)) {
        onValueChange(day);
      }
    }}
    value={String(value)}
  >
    <SelectTrigger
      aria-label={m.budget_month_start_label()}
      className={TRIGGER_WIDTH}
      placeholder={m.budget_month_start_label()}
    />
    <SelectContent>
      <SelectGroup>
        {BUDGET_MONTH_START_DAYS.map((day, position) => (
          <SelectItem index={position} key={day} value={String(day)}>
            {startDayLabel(day)}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

export const BudgetMonthExample = ({ startDay }: { startDay: number }) => {
  const today = new Date();
  const month = budgetMonthOfDay(
    {
      date: today.getDate(),
      month: today.getMonth(),
      year: today.getFullYear(),
    },
    startDay
  );

  return (
    <p className="text-muted-foreground text-xs">
      {m.budget_month_start_example(
        budgetMonthExample(month, startDay, getLocale())
      )}
    </p>
  );
};

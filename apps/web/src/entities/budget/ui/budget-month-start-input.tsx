import {
  budgetMonthOfDay,
  budgetMonthStartDaySchema,
  DEFAULT_BUDGET_MONTH_START_DAY,
  MAX_BUDGET_MONTH_START_DAY,
} from "@freenary/api/lib/budget-month";
import { Input } from "@freenary/ui/components/input";
import { useId, useState } from "react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

import { budgetMonthExample } from "../model/budget-month-label";

interface BudgetMonthStartInputProps {
  disabled?: boolean;
  onValueChange: (startDay: number) => void;
  value: number;
}

const INPUT_WIDTH = "w-20 tabular-nums";

const parsedStartDay = (draft: string): number | null => {
  const parsed = budgetMonthStartDaySchema.safeParse(Number(draft));

  return draft.trim() !== "" && parsed.success ? parsed.data : null;
};

export const BudgetMonthStartInput = ({
  disabled,
  onValueChange,
  value,
}: BudgetMonthStartInputProps) => {
  const hintId = useId();
  const [editing, setEditing] = useState<string | null>(null);
  const draft = editing ?? String(value);

  const startDay = parsedStartDay(draft);
  const isInvalid = startDay === null;

  const commit = () => {
    if (startDay !== null && startDay !== value) {
      onValueChange(startDay);
    }

    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <Input
        aria-describedby={hintId}
        aria-invalid={isInvalid}
        aria-label={m.budget_month_start_label()}
        className={INPUT_WIDTH}
        disabled={disabled}
        inputMode="numeric"
        max={MAX_BUDGET_MONTH_START_DAY}
        min={DEFAULT_BUDGET_MONTH_START_DAY}
        onBlur={commit}
        onChange={(event) => setEditing(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
        }}
        step={1}
        type="number"
        value={draft}
      />
      <p
        className={
          isInvalid
            ? "text-destructive text-xs"
            : "text-muted-foreground text-xs"
        }
        id={hintId}
      >
        {isInvalid
          ? m.budget_month_start_invalid()
          : m.budget_month_start_hint()}
      </p>
    </div>
  );
};

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

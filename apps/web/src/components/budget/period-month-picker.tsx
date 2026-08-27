import { Button } from "@freenary/ui/components/button";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { MONTH_LABELS } from "@/lib/budget/period";

export const PeriodMonthPicker = ({
  year,
  onYearChange,
  anchorYear,
  anchorMonth,
  onSelectMonth,
}: {
  year: number;
  onYearChange: (year: number) => void;
  anchorYear: number;
  anchorMonth: number;
  onSelectMonth: (month: number) => void;
}) => (
  <>
    <div className="flex items-center justify-between px-1">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onYearChange(year - 1)}
        aria-label="Previous year"
      >
        <CaretLeft />
      </Button>
      <span className="text-xs font-medium tabular-nums">{year}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onYearChange(year + 1)}
        aria-label="Next year"
      >
        <CaretRight />
      </Button>
    </div>
    <div className="grid grid-cols-3 gap-1">
      {MONTH_LABELS.map((label, i) => {
        const isCurrent = i === anchorMonth && year === anchorYear;
        return (
          <Button
            key={label}
            variant={isCurrent ? "default" : "ghost"}
            size="xs"
            onClick={() => onSelectMonth(i)}
            className="tabular-nums"
          >
            {label}
          </Button>
        );
      })}
    </div>
  </>
);

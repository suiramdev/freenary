import { Button } from "@freenary/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@freenary/ui/components/popover";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";

import { PeriodMonthPicker } from "@/components/budget/period-month-picker";
import { formatMonthYear, TIME_RANGES } from "@/lib/budget/period";
import type { TimeRange } from "@/lib/budget/period";

export const PeriodNavigator = ({
  from,
  range,
  onRangeChange,
  onMonthChange,
}: {
  from: Date;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onMonthChange: (year: number, month: number) => void;
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(from.getFullYear());

  const anchorMonth = from.getMonth();
  const anchorYear = from.getFullYear();

  const navigateMonth = (delta: number) => {
    const d = new Date(anchorYear, anchorMonth + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  const selectMonth = (month: number) => {
    onMonthChange(pickerYear, month);
    setPopoverOpen(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigateMonth(-1)}
          aria-label="Previous month"
        >
          <CaretLeft />
        </Button>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger render={<Button variant="ghost" size="sm" />}>
            <span className="text-xs font-medium">{formatMonthYear(from)}</span>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="center">
            <PeriodMonthPicker
              year={pickerYear}
              onYearChange={setPickerYear}
              anchorYear={anchorYear}
              anchorMonth={anchorMonth}
              onSelectMonth={selectMonth}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigateMonth(1)}
          aria-label="Next month"
        >
          <CaretRight />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        {TIME_RANGES.map((r) => (
          <Button
            key={r}
            variant={range === r ? "secondary" : "ghost"}
            size="xs"
            onClick={() => onRangeChange(r)}
            className="tabular-nums"
          >
            {r}
          </Button>
        ))}
      </div>
    </div>
  );
};

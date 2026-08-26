import { Button } from "@freenary/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@freenary/ui/components/popover";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";

type TimeRange = "1M" | "3M" | "1Y";

interface PeriodNavigatorProps {
  from: Date;
  to: Date;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onMonthChange: (year: number, month: number) => void;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const RANGES: TimeRange[] = ["1M", "3M", "1Y"];

const formatMonthYear = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

export const PeriodNavigator = ({
  from,
  range,
  onRangeChange,
  onMonthChange,
}: PeriodNavigatorProps) => {
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
            <div className="flex items-center justify-between px-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setPickerYear((y) => y - 1)}
                aria-label="Previous year"
              >
                <CaretLeft />
              </Button>
              <span className="text-xs font-medium tabular-nums">
                {pickerYear}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setPickerYear((y) => y + 1)}
                aria-label="Next year"
              >
                <CaretRight />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((label, i) => {
                const isCurrent =
                  i === anchorMonth && pickerYear === anchorYear;
                return (
                  <Button
                    key={label}
                    variant={isCurrent ? "default" : "ghost"}
                    size="xs"
                    onClick={() => selectMonth(i)}
                    className="tabular-nums"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
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
        {RANGES.map((r) => (
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

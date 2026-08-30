import { Button } from "@freenary/ui/components/button";
import { Calendar } from "@freenary/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@freenary/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@freenary/ui/components/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@freenary/ui/components/toggle-group";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  AGGREGATION_LABELS,
  AGGREGATION_MODES,
  formatPeriodLabel,
  isMultiMonth,
  rangeMonths,
  TIME_RANGES,
} from "@/lib/budget/period";
import type { AggregationMode, TimeRange } from "@/lib/budget/period";

const YEAR_PAGE_SIZE = 12;

/** A 3×4 grid of years with page navigation. */
const PeriodYearPicker = ({
  selectedYear,
  minYear,
  maxYear,
  onSelectYear,
}: {
  selectedYear: number;
  minYear?: number;
  maxYear?: number;
  onSelectYear: (year: number) => void;
}) => {
  const [pageStart, setPageStart] = useState(
    selectedYear - (selectedYear % YEAR_PAGE_SIZE)
  );
  const years = Array.from({ length: YEAR_PAGE_SIZE }, (_, i) => pageStart + i);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setPageStart((p) => p - YEAR_PAGE_SIZE)}
          aria-label="Previous years"
        >
          <CaretLeftIcon />
        </Button>
        <span className="text-xs font-medium tabular-nums">
          {pageStart} – {pageStart + YEAR_PAGE_SIZE - 1}
        </span>
        <Button
          variant="ghost"
          onClick={() => setPageStart((p) => p + YEAR_PAGE_SIZE)}
          aria-label="Next years"
        >
          <CaretRightIcon />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {years.map((year) => {
          const disabled =
            (minYear !== undefined && year < minYear) ||
            (maxYear !== undefined && year > maxYear);
          return (
            <Button
              key={year}
              variant={year === selectedYear ? "default" : "ghost"}
              disabled={disabled}
              onClick={() => onSelectYear(year)}
              className="tabular-nums"
            >
              {year}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export const PeriodNavigator = ({
  aggregation,
  from,
  to,
  range,
  firstMonth,
  lastMonth,
  onAggregationChange,
  onRangeChange,
  onMonthChange,
}: {
  aggregation: AggregationMode;
  from: Date;
  to: Date;
  range: TimeRange;
  firstMonth?: Date;
  lastMonth?: Date;
  onAggregationChange: (mode: AggregationMode) => void;
  onRangeChange: (range: TimeRange) => void;
  onMonthChange: (year: number, month: number) => void;
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const anchorMonth = to.getMonth();
  const anchorYear = to.getFullYear();
  const step = rangeMonths(range);

  const navigate = (direction: number) => {
    const d = new Date(anchorYear, anchorMonth + direction * step, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  // Disable arrows when navigating would exceed the data bounds.
  const canGoBack =
    !firstMonth || new Date(anchorYear, anchorMonth - step, 1) >= firstMonth;
  const canGoForward =
    !lastMonth || new Date(anchorYear, anchorMonth + step, 1) <= lastMonth;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          disabled={!canGoBack}
          onClick={() => navigate(-1)}
          aria-label="Previous period"
        >
          <CaretLeftIcon />
        </Button>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger render={<Button variant="ghost" />}>
            {formatPeriodLabel(from, to, range)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            {range === "1Y" ? (
              <PeriodYearPicker
                selectedYear={anchorYear}
                minYear={firstMonth?.getFullYear()}
                maxYear={lastMonth?.getFullYear()}
                onSelectYear={(year) => {
                  onMonthChange(year, 11);
                  setPopoverOpen(false);
                }}
              />
            ) : (
              <Calendar
                mode="single"
                defaultMonth={to}
                selected={to}
                disabled={[
                  ...(firstMonth ? [{ before: firstMonth }] : []),
                  ...(lastMonth ? [{ after: lastMonth }] : []),
                ]}
                onSelect={(date) => {
                  if (date) {
                    onMonthChange(date.getFullYear(), date.getMonth());
                    setPopoverOpen(false);
                  }
                }}
              />
            )}
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          disabled={!canGoForward}
          onClick={() => navigate(1)}
          aria-label="Next period"
        >
          <CaretRightIcon />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        {isMultiMonth(range) && (
          <Select
            value={aggregation}
            onValueChange={(next) => {
              const mode = AGGREGATION_MODES.find((m) => m === next);
              if (mode) {
                onAggregationChange(mode);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue>{() => AGGREGATION_LABELS[aggregation]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {AGGREGATION_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {AGGREGATION_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        <ToggleGroup
          value={[range]}
          onValueChange={([next]) => {
            const timeRange = TIME_RANGES.find((r) => r === next);
            if (timeRange) {
              onRangeChange(timeRange);
            }
          }}
        >
          {TIME_RANGES.map((r) => (
            <ToggleGroupItem key={r} value={r}>
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};

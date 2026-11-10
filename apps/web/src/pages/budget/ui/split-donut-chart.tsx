import { PieChart } from "@freenary/ui/components/charts/pie-chart";
import { PieSlice } from "@freenary/ui/components/charts/pie-slice";
import { cn } from "@freenary/ui/lib/utils";
import { useState } from "react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { formatCurrency } from "@/shared/lib/format-currency";

export interface SplitSlice {
  color: string;
  id: string;
  label: string;
  value: number;
}

interface SplitDonutChartProps {
  currency: string;
  label: string;
  slices: SplitSlice[];
}

const DONUT_SIZE_PX = 148;
const DONUT_INNER_RADIUS_PX = 46;
const DONUT_HOVER_OFFSET_PX = 6;
const SLICE_PAD_ANGLE = 0.02;
const SLICE_CORNER_RADIUS_PX = 2;

export const SplitDonutChart = ({
  currency,
  label,
  slices,
}: SplitDonutChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const hovered = hoveredIndex === null ? undefined : slices[hoveredIndex];

  const share = new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
    style: "percent",
  });

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div
        aria-hidden="true"
        className="relative mx-auto shrink-0"
        style={{ height: DONUT_SIZE_PX, width: DONUT_SIZE_PX }}
      >
        <PieChart
          cornerRadius={SLICE_CORNER_RADIUS_PX}
          data={slices}
          hoverOffset={DONUT_HOVER_OFFSET_PX}
          hoveredIndex={hoveredIndex}
          innerRadius={DONUT_INNER_RADIUS_PX}
          onHoverChange={setHoveredIndex}
          padAngle={SLICE_PAD_ANGLE}
          size={DONUT_SIZE_PX}
        >
          {slices.map((slice, index) => (
            <PieSlice hoverEffect="grow" index={index} key={slice.id} />
          ))}
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-sm font-medium tabular-nums">
            {formatCurrency(hovered?.value ?? total, currency)}
          </span>
          <span className="text-muted-foreground max-w-20 truncate text-[10px]">
            {hovered?.label ?? m.chart_total()}
          </span>
        </div>
      </div>
      <ul aria-label={label} className="flex flex-col gap-1">
        {slices.map((slice, index) => (
          <li
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors",
              hoveredIndex === index && "bg-muted"
            )}
            key={slice.id}
          >
            <span
              className="size-2 shrink-0 rounded-[1px]"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-muted-foreground truncate">
              {slice.label}
            </span>
            <span className="ms-auto shrink-0 font-mono tabular-nums">
              {formatCurrency(slice.value, currency)}
            </span>
            <span className="text-muted-foreground min-w-9 shrink-0 text-end font-mono tabular-nums">
              {share.format(total > 0 ? slice.value / total : 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

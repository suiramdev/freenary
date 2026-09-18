import { CATEGORY_GROUP_COLORS } from "@freenary/api/lib/taxonomy";
import type { CategoryGroup } from "@freenary/api/lib/taxonomy";
import { ChartContainer, ChartTooltip } from "@freenary/ui/components/chart";
import type { ChartConfig } from "@freenary/ui/components/chart";
import { FluidHoverHighlight } from "@freenary/ui/components/fluid-hover-highlight";
import { ScrollArea } from "@freenary/ui/components/scroll-area";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@freenary/ui/hooks/use-fluid-hover";
import { cn } from "@freenary/ui/lib/utils";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { PieSectorDataItem } from "recharts";

import { PRESS_MOTION } from "@/components/budget/list-controls";
import { ChartTooltipCard } from "@/components/shared/chart-tooltip";
import type { CategorySelection } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { categoryGroupLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface GroupData {
  amount: number;
  group: CategoryGroup;
}

interface SpendingBreakdownChartProps {
  data: GroupData[];
  onSelect?: (selection: CategorySelection | null) => void;
}

const UNSELECTED_OPACITY = 0.3;

const buildConfigKeyedByGroupSlug = (data: GroupData[]): ChartConfig => {
  const config: ChartConfig = {};

  for (const entry of data) {
    config[entry.group] = {
      color: CHART_COLOR_VARS[CATEGORY_GROUP_COLORS[entry.group]],
      label: categoryGroupLabel(entry.group),
    };
  }

  return config;
};

const SpendingBreakdownTooltip = ({
  active,
  config,
  payload,
  total,
}: {
  active?: boolean;
  config: ChartConfig;
  payload?: { payload?: GroupData }[];
  total: number;
}) => {
  const slice = active ? payload?.[0]?.payload : undefined;

  if (!slice) {
    return null;
  }

  const share = total > 0 ? Math.round((slice.amount / total) * 100) : 0;

  return (
    <ChartTooltipCard className="min-w-32">
      <div className="flex flex-1 items-center justify-between gap-3 leading-none">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: config[slice.group]?.color }}
          />
          <span className="text-muted-foreground">
            {config[slice.group]?.label ?? slice.group}
          </span>
        </span>
        <span className="text-foreground font-mono font-medium tabular-nums">
          {formatCurrency(slice.amount)} ({share}%)
        </span>
      </div>
    </ChartTooltipCard>
  );
};

const LegendChip = ({
  amount,
  color,
  index,
  isSelected,
  label,
  onToggle,
  registerItem,
}: {
  amount: number;
  color: string | undefined;
  index: number;
  isSelected: boolean;
  label: ReactNode;
  onToggle: (() => void) | undefined;
  registerItem: (index: number, element: HTMLElement | null) => void;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  useRegisterFluidHoverItem(registerItem, index, ref);

  return (
    <li>
      <motion.button
        {...PRESS_MOTION}
        aria-pressed={isSelected}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px]",
          onToggle && "hover:text-foreground cursor-pointer",
          isSelected ? "text-foreground" : "text-muted-foreground"
        )}
        disabled={!onToggle}
        onClick={onToggle}
        ref={ref}
        type="button"
      >
        <span
          className="size-2 rounded-[1px]"
          style={{ backgroundColor: color }}
        />
        <span>{label}</span>
        <span className="text-foreground">{formatCurrency(amount)}</span>
      </motion.button>
    </li>
  );
};

export const SpendingBreakdownChart = ({
  data,
  onSelect,
}: SpendingBreakdownChartProps) => {
  const config = buildConfigKeyedByGroupSlug(data);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(
    null
  );
  const legendRef = useRef<HTMLUListElement>(null);
  const legendHover = useFluidHover(legendRef, { axis: "xy" });

  const total = data.reduce((sum, entry) => sum + entry.amount, 0);

  const toggleGroup = useCallback(
    (group: CategoryGroup) => {
      const next = selectedGroup === group ? null : group;
      setSelectedGroup(next);
      onSelect?.(next === null ? null : { group: next, kind: "group" });
    },
    [onSelect, selectedGroup]
  );

  const selectSlice = useCallback(
    (_sector: PieSectorDataItem, index: number) => {
      const entry = data[index];

      if (entry) {
        toggleGroup(entry.group);
      }
    },
    [data, toggleGroup]
  );

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_breakdown_empty()}
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <ChartContainer
        config={config}
        className="mx-auto aspect-square h-auto w-full max-w-[176px] shrink-0"
      >
        <PieChart>
          <ChartTooltip
            content={<SpendingBreakdownTooltip config={config} total={total} />}
          />
          <Pie
            data={data}
            isAnimationActive={false}
            dataKey="amount"
            nameKey="group"
            innerRadius="55%"
            outerRadius="100%"
            className={onSelect ? "cursor-pointer" : undefined}
            onClick={onSelect ? selectSlice : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.group}
                fill={config[entry.group]?.color}
                fillOpacity={
                  selectedGroup !== null && selectedGroup !== entry.group
                    ? UNSELECTED_OPACITY
                    : 1
                }
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ScrollArea className="min-h-0 flex-1">
        <ul
          className="relative flex flex-wrap content-start gap-x-4 gap-y-1.5 px-1"
          ref={legendRef}
          {...legendHover.handlers}
        >
          <FluidHoverHighlight
            className="rounded-lg"
            hidden={!onSelect}
            hover={legendHover}
          />
          {data.map((d, index) => (
            <LegendChip
              amount={d.amount}
              color={config[d.group]?.color}
              index={index}
              isSelected={selectedGroup === d.group}
              key={d.group}
              label={config[d.group]?.label ?? d.group}
              onToggle={onSelect ? () => toggleGroup(d.group) : undefined}
              registerItem={legendHover.registerItem}
            />
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};

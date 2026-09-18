import { CATEGORY_GROUP_COLORS } from "@freenary/api/lib/taxonomy";
import type { CategoryGroup } from "@freenary/api/lib/taxonomy";
import { ChartContainer, ChartTooltip } from "@freenary/ui/components/chart";
import type { ChartConfig } from "@freenary/ui/components/chart";
import { cn } from "@freenary/ui/lib/utils";
import { useCallback, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { PieSectorDataItem } from "recharts";

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
    <div className="border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
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
    </div>
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
      <ul className="flex min-h-0 flex-1 flex-wrap content-start gap-x-4 gap-y-1.5 overflow-y-auto px-1">
        {data.map((entry) => {
          const isSelected = selectedGroup === entry.group;

          return (
            <li key={entry.group}>
              <button
                type="button"
                disabled={!onSelect}
                aria-pressed={isSelected}
                onClick={() => toggleGroup(entry.group)}
                className={cn(
                  "flex items-center gap-1.5 font-mono text-[11px] transition-transform duration-150 ease-out active:scale-[0.96]",
                  onSelect && "hover:text-foreground cursor-pointer",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span
                  className="size-2 rounded-[1px]"
                  style={{ backgroundColor: config[entry.group]?.color }}
                />
                <span>{config[entry.group]?.label ?? entry.group}</span>
                <span className="text-foreground">
                  {formatCurrency(entry.amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

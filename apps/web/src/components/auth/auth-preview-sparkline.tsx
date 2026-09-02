import type { CategoryColor } from "@freenary/api/lib/taxonomy";
import type { ChartConfig } from "@freenary/ui/components/chart";
import { ChartContainer } from "@freenary/ui/components/chart";
import { cn } from "@freenary/ui/lib/utils";
import { useId, useMemo } from "react";
import { Area, AreaChart } from "recharts";

import { CHART_COLOR_VARS } from "@/lib/chart-colors";

const ID_SEPARATORS = /\W/gu;
const NO_MARGIN = { bottom: 0, left: 0, right: 0, top: 0 };

interface AuthPreviewSparklineProps {
  className?: string;
  color: CategoryColor;
  /** A bare series; the position in it becomes the x value. */
  data: number[];
}

/**
 * Decorative spark for the login showcase cards: no axes, grid or tooltip, and
 * a token-driven colour so it reads on either appearance.
 */
export const AuthPreviewSparkline = ({
  className,
  color,
  data,
}: AuthPreviewSparklineProps) => {
  // Scoped so two sparks on the same screen keep their own gradients; the
  // separators `useId` emits are illegal in a `url(#…)` reference.
  const gradientId = `spark-${useId().replace(ID_SEPARATORS, "")}`;
  const rows = useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  );
  const config = useMemo<ChartConfig>(
    () => ({ value: { color: CHART_COLOR_VARS[color] } }),
    [color]
  );

  return (
    <ChartContainer className={cn("aspect-auto", className)} config={config}>
      <AreaChart data={rows} margin={NO_MARGIN}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-value)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="var(--color-value)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        {/* Calm: the panel paints once, and an entrance sweep that never gets
            its frames would leave the card blank. */}
        <Area
          dataKey="value"
          dot={false}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          stroke="var(--color-value)"
          strokeWidth={1.5}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
};

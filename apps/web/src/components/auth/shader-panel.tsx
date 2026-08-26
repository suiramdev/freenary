import { DotGrid } from "@paper-design/shaders-react";

import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Sparkline } from "@/components/dither-kit/sparkline";
import { DitherProgress } from "@/components/dither-kit/progress";

const monthlySpending = [
  2100, 2800, 2400, 3100, 2900, 3400, 2700, 3200, 2600, 3000, 2850, 3247,
];

const weeklyData = [
  { amount: 45 },
  { amount: 82 },
  { amount: 35 },
  { amount: 120 },
  { amount: 95 },
  { amount: 150 },
  { amount: 60 },
];

const weeklyConfig = { amount: { color: "green" as const } };

const netWorthTrend = [
  32000, 33500, 34200, 35800, 37100, 38500, 36900, 39200, 41000, 43500, 45200,
  47850,
];

export const ShaderPanel = () => (
  <div className="bg-background relative hidden overflow-hidden lg:flex lg:flex-col">
    <DotGrid
      colorBack="#00000000"
      colorFill="#333333"
      colorStroke="#33333300"
      gapX={24}
      gapY={24}
      opacityRange={0.3}
      shape="circle"
      size={1}
      sizeRange={0}
      strokeWidth={0}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />

    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <div className="w-full max-w-[280px] space-y-3">
        {/* Monthly Spending */}
        <div className="border-border/50 bg-card/80 space-y-1 border p-3 backdrop-blur-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-xs">
              Monthly Spending
            </span>
            <span className="text-muted-foreground text-xs">+2.3%</span>
          </div>
          <p className="text-lg font-bold tabular-nums">$3,247</p>
          <Sparkline
            data={monthlySpending}
            color="green"
            className="h-[48px] w-full"
          />
        </div>

        {/* Emergency Fund */}
        <div className="border-border/50 bg-card/80 space-y-2 border p-3 backdrop-blur-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-xs">
              Emergency Fund
            </span>
            <span className="text-primary text-xs font-medium">70%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold tabular-nums">$8,400</p>
            <span className="text-muted-foreground text-xs">/ $12,000</span>
          </div>
          <DitherProgress value={0.7} color="blue" className="h-1.5" />
        </div>

        {/* This Week */}
        <div className="border-border/50 bg-card/80 space-y-1 border p-3 backdrop-blur-sm">
          <span className="text-muted-foreground text-xs">This Week</span>
          <p className="text-lg font-bold tabular-nums">$587</p>
          <BarChart
            data={weeklyData}
            config={weeklyConfig}
            interactive={false}
            margins={{ top: 2, right: 0, bottom: 0, left: 0 }}
            className="h-[64px] w-full"
          >
            <Bar dataKey="amount" />
          </BarChart>
        </div>

        {/* Net Worth */}
        <div className="border-border/50 bg-card/80 space-y-1 border p-3 backdrop-blur-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-xs">Net Worth</span>
            <span className="text-primary text-xs">+12.4%</span>
          </div>
          <p className="text-lg font-bold tabular-nums">$47,850</p>
          <Sparkline
            data={netWorthTrend}
            color="blue"
            className="h-[40px] w-full"
          />
        </div>
      </div>
    </div>

    <div className="relative z-10 p-8">
      <h2 className="text-3xl font-bold tracking-tight">freenary</h2>
      <p className="text-muted-foreground mt-1 text-sm italic">
        Your finances, understood.
      </p>
    </div>
  </div>
);

import { AuthPreviewCard } from "@/components/auth/auth-preview-card";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { DitherProgress } from "@/components/dither-kit/progress";
import { Sparkline } from "@/components/dither-kit/sparkline";
import { ShaderBackground } from "@/components/shared/shader-background";
import {
  monthlySpending,
  netWorthTrend,
  weeklyConfig,
  weeklyData,
} from "@/lib/auth/preview-metrics";

export const AuthShowcasePanel = () => (
  <div className="bg-background relative hidden overflow-hidden lg:flex lg:flex-col">
    <ShaderBackground />

    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <div className="w-full max-w-[280px] space-y-3">
        <AuthPreviewCard
          label="Monthly Spending"
          trailing={
            <span className="text-muted-foreground text-xs">+2.3%</span>
          }
          value="$3,247"
        >
          <Sparkline
            className="h-[48px] w-full"
            color="green"
            data={monthlySpending}
          />
        </AuthPreviewCard>

        <AuthPreviewCard
          className="space-y-2"
          label="Emergency Fund"
          subValue="/ $12,000"
          trailing={
            <span className="text-primary text-xs font-medium">70%</span>
          }
          value="$8,400"
        >
          <DitherProgress className="h-1.5" color="blue" value={0.7} />
        </AuthPreviewCard>

        <AuthPreviewCard label="This Week" value="$587">
          <BarChart
            className="h-[64px] w-full"
            config={weeklyConfig}
            data={weeklyData}
            interactive={false}
            margins={{ bottom: 0, left: 0, right: 0, top: 2 }}
          >
            <Bar dataKey="amount" />
          </BarChart>
        </AuthPreviewCard>

        <AuthPreviewCard
          label="Net Worth"
          trailing={<span className="text-primary text-xs">+12.4%</span>}
          value="$47,850"
        >
          <Sparkline
            className="h-[40px] w-full"
            color="blue"
            data={netWorthTrend}
          />
        </AuthPreviewCard>
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

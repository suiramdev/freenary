import { AuthPreviewCard } from "@/components/auth/auth-preview-card";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { DitherProgress } from "@/components/dither-kit/progress";
import { Sparkline } from "@/components/dither-kit/sparkline";
import { ShaderBackground } from "@/components/shared/shader-background";
import {
  formatPreviewAmount,
  formatPreviewChange,
  formatPreviewRatio,
  monthlySpendingSeries,
  netWorthTrend,
  previewFigures,
  weeklyConfig,
  weeklyData,
} from "@/lib/auth/preview-metrics";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

export const AuthShowcasePanel = () => {
  const locale = getLocale();
  const emergencyFundProgress =
    previewFigures.emergencyFund / previewFigures.emergencyFundTarget;

  return (
    <div className="bg-background relative hidden overflow-hidden lg:flex lg:flex-col">
      <ShaderBackground />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <div className="flex w-full max-w-[280px] flex-col gap-3">
          <AuthPreviewCard
            label={m.auth_showcase_monthly_spending()}
            trailing={
              <span className="text-muted-foreground text-xs">
                {formatPreviewChange(
                  previewFigures.monthlySpendingChange,
                  locale
                )}
              </span>
            }
            value={formatPreviewAmount(previewFigures.monthlySpending, locale)}
          >
            <Sparkline
              className="h-[48px] w-full"
              color="green"
              data={monthlySpendingSeries}
            />
          </AuthPreviewCard>

          <AuthPreviewCard
            label={m.auth_showcase_emergency_fund()}
            subValue={m.auth_showcase_fund_target({
              target: formatPreviewAmount(
                previewFigures.emergencyFundTarget,
                locale
              ),
            })}
            trailing={
              <span className="text-primary text-xs font-medium">
                {formatPreviewRatio(emergencyFundProgress, locale)}
              </span>
            }
            value={formatPreviewAmount(previewFigures.emergencyFund, locale)}
          >
            <DitherProgress
              className="h-1.5"
              color="blue"
              value={emergencyFundProgress}
            />
          </AuthPreviewCard>

          <AuthPreviewCard
            label={m.auth_showcase_this_week()}
            value={formatPreviewAmount(previewFigures.thisWeek, locale)}
          >
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
            label={m.auth_showcase_net_worth()}
            trailing={
              <span className="text-primary text-xs">
                {formatPreviewChange(previewFigures.netWorthChange, locale)}
              </span>
            }
            value={formatPreviewAmount(previewFigures.netWorth, locale)}
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
          {m.auth_tagline()}
        </p>
      </div>
    </div>
  );
};

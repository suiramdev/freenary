import { ChartContainer } from "@freenary/ui/components/chart";
import { Progress } from "@freenary/ui/components/progress";
import type { CSSProperties } from "react";
import { Bar, BarChart } from "recharts";

import { AuthPreviewCard } from "@/components/auth/auth-preview-card";
import { AuthPreviewSparkline } from "@/components/auth/auth-preview-sparkline";
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
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/** base-ui's `Progress` reads percentages; the demo figures are ratios. */
const RATIO_TO_PERCENT = 100;

const WEEKLY_MARGIN = { bottom: 0, left: 0, right: 0, top: 2 };

// SAFETY: `CSSProperties` carries no index signature for custom properties, and
// `--fund-color` is the only key set here.
const FUND_COLOR_STYLE = {
  "--fund-color": CHART_COLOR_VARS.blue,
} as CSSProperties;

export const AuthShowcasePanel = () => {
  const locale = getLocale();
  const emergencyFundProgress =
    previewFigures.emergencyFund / previewFigures.emergencyFundTarget;

  return (
    <div className="bg-background hidden lg:flex lg:flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
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
            <AuthPreviewSparkline
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
            {/* Illustrative, and the figure is already spelled out above, so the
                bar stays out of the accessibility tree. */}
            <Progress
              aria-hidden="true"
              className="[&_[data-slot=progress-indicator]]:bg-(--fund-color) [&_[data-slot=progress-track]]:h-1.5"
              style={FUND_COLOR_STYLE}
              value={emergencyFundProgress * RATIO_TO_PERCENT}
            />
          </AuthPreviewCard>

          <AuthPreviewCard
            label={m.auth_showcase_this_week()}
            value={formatPreviewAmount(previewFigures.thisWeek, locale)}
          >
            <ChartContainer
              className="aspect-auto h-[64px] w-full"
              config={weeklyConfig}
            >
              <BarChart data={weeklyData} margin={WEEKLY_MARGIN}>
                <Bar
                  dataKey="amount"
                  fill="var(--color-amount)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
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
            <AuthPreviewSparkline
              className="h-[40px] w-full"
              color="blue"
              data={netWorthTrend}
            />
          </AuthPreviewCard>
        </div>
      </div>

      <div className="p-8">
        <h2 className="text-3xl font-bold tracking-tight">freenary</h2>
        <p className="text-muted-foreground mt-1 text-sm italic">
          {m.auth_tagline()}
        </p>
      </div>
    </div>
  );
};

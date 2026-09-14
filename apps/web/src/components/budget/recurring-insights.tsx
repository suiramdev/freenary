import { Skeleton } from "@freenary/ui/components/skeleton";
import { cn } from "@freenary/ui/lib/utils";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCalendarEventLine,
  RiPieChartLine,
  RiRepeatLine,
} from "@remixicon/react";

import { formatCurrency } from "@/lib/budget/format-currency";
import type { RecurringInsight, RecurringTrend } from "@/lib/budget/recurring";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/** Past four lines a reader skims none of them. */
const MAX_INSIGHTS = 4;

interface InsightLine {
  Icon: RemixiconComponentType;
  text: string;
}

/** Flat carries no figure, so the three directions cannot share one table. */
const trendLine = (
  trend: RecurringTrend,
  percentFormat: Intl.NumberFormat
): InsightLine => {
  const percent = percentFormat.format(Math.abs(trend.ratio));

  if (trend.direction === "up") {
    return {
      Icon: RiArrowUpLine,
      text: m.budget_recurring_insight_trend_up({ percent }),
    };
  }
  if (trend.direction === "down") {
    return {
      Icon: RiArrowDownLine,
      text: m.budget_recurring_insight_trend_down({ percent }),
    };
  }
  return {
    Icon: RiRepeatLine,
    text: m.budget_recurring_insight_trend_flat(),
  };
};

/**
 * Returns rather than a `switch`: the trailing `insight.trend` only typechecks
 * once every other variant has returned, so a new insight kind is a compile
 * error here instead of a silently missing line.
 */
const insightLine = (
  insight: RecurringInsight,
  currency: string,
  percentFormat: Intl.NumberFormat
): InsightLine => {
  if (insight.kind === "due-soon") {
    return {
      Icon: RiCalendarEventLine,
      text: m.budget_recurring_insight_due({
        count: insight.count,
        days: insight.days,
      }),
    };
  }
  if (insight.kind === "share") {
    const percent = percentFormat.format(insight.share);
    return {
      Icon: RiPieChartLine,
      text:
        insight.denominator === "plan"
          ? m.budget_recurring_insight_share_plan({ percent })
          : m.budget_recurring_insight_share_income({ percent }),
    };
  }
  if (insight.kind === "top-annual") {
    return {
      Icon: RiRepeatLine,
      text: m.budget_recurring_insight_top({
        amount: formatCurrency(insight.annualMinor, currency),
        merchant: insight.label,
      }),
    };
  }
  return trendLine(insight.trend, percentFormat);
};

/** One wrapped row of `text-sm`, matched by the pending placeholder. */
const ROW_HEIGHT = "h-5";

/**
 * The sentences the headline figures are worth saying out loud. A rising
 * recurring cost is not an error, so the arrow carries the direction and the
 * copy stays muted.
 */
export const RecurringInsights = ({
  currency,
  insights,
  isPending,
}: {
  currency: string;
  insights: RecurringInsight[];
  isPending: boolean;
}) => {
  // The strip sits above every other section, so arriving without a stand-in
  // would shove the whole tab down by a row.
  if (isPending) {
    return (
      <div aria-busy="true">
        <output className="sr-only">{m.budget_recurring_loading()}</output>
        <Skeleton aria-hidden="true" className={cn("max-w-lg", ROW_HEIGHT)} />
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  const percentFormat = new Intl.NumberFormat(getLocale(), {
    maximumFractionDigits: 0,
    style: "percent",
  });

  return (
    <ul
      aria-label={m.budget_recurring_insights_label()}
      className="flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      {insights.slice(0, MAX_INSIGHTS).map((insight) => {
        const { Icon, text } = insightLine(insight, currency, percentFormat);

        return (
          <li
            className="text-muted-foreground flex items-center gap-1.5 text-sm"
            key={insight.kind}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>{text}</span>
          </li>
        );
      })}
    </ul>
  );
};

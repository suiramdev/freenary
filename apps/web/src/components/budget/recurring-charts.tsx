import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@freenary/ui/components/select";
import { Skeleton } from "@freenary/ui/components/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@freenary/ui/components/toggle-group";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { FrequencyCostChart } from "@/components/budget/frequency-cost-chart";
import { PurchaseFrequencyChart } from "@/components/budget/purchase-frequency-chart";
import { RecurringCategoryChart } from "@/components/budget/recurring-category-chart";
import { RecurringForecastChart } from "@/components/budget/recurring-forecast-chart";
import { RecurringSplitChart } from "@/components/budget/recurring-split-chart";
import { RecurringTrendChart } from "@/components/budget/recurring-trend-chart";
import type { RecurringData } from "@/lib/budget/recurring";
import {
  forecastSeries,
  frequencyCostPoints,
  purchaseFrequency,
  recurringByCategory,
  spendSplit,
} from "@/lib/budget/recurring";
import {
  RECURRING_COMPANION_VIEWS,
  RECURRING_VIEWS,
} from "@/lib/budget/search";
import type {
  RecurringCompanionView,
  RecurringView,
} from "@/lib/budget/search";
import { m } from "@/paraglide/messages.js";

type TrendProps = ComponentProps<typeof RecurringTrendChart>;
type ForecastProps = ComponentProps<typeof RecurringForecastChart>;
type ScatterProps = ComponentProps<typeof FrequencyCostChart>;
type CategoryProps = ComponentProps<typeof RecurringCategoryChart>;
type FrequencyProps = ComponentProps<typeof PurchaseFrequencyChart>;
type SplitProps = ComponentProps<typeof RecurringSplitChart>;

/** Both positions draw inside the same box, so a view switch moves nothing. */
const CHART_BODY = "h-[280px]";

const PRESS = "transition-transform duration-150 ease-out active:scale-[0.96]";

/** Past the dearest few the shared scale flattens every remaining bar. */
const MAX_CATEGORY_ROWS = 8;

/**
 * The tables hold message *functions*: calling one at module scope would freeze
 * the locale of whichever request loaded this file first.
 */
const VIEW_TITLES = {
  forecast: m.budget_recurring_forecast_title,
  scatter: m.budget_recurring_scatter_title,
  trend: m.budget_recurring_trend_title,
} satisfies Record<RecurringView, () => string>;

const VIEW_LABELS = {
  forecast: m.budget_recurring_view_forecast,
  scatter: m.budget_recurring_view_scatter,
  trend: m.budget_recurring_view_trend,
} satisfies Record<RecurringView, () => string>;

const COMPANION_LABELS = {
  categories: m.budget_recurring_view_categories,
  frequency: m.budget_recurring_view_frequency,
  split: m.budget_recurring_view_split,
} satisfies Record<RecurringCompanionView, () => string>;

const ChartSkeleton = ({ label }: { label: string }) => (
  <div aria-busy="true" className="h-full">
    <output className="sr-only">{label}</output>
    <Skeleton aria-hidden="true" className="h-full" />
  </div>
);

// "Nothing recurring" and "the request failed" are different claims, and a
// failed request must not print one the response never made.
const ChartUnavailable = () => (
  <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
    {m.budget_chart_unavailable()}
  </p>
);

const RecurringPrimaryBody = ({
  forecast,
  isError,
  isPending,
  scatter,
  trend,
  view,
}: {
  forecast: ForecastProps | undefined;
  isError: boolean;
  isPending: boolean;
  scatter: ScatterProps | undefined;
  trend: TrendProps | undefined;
  view: RecurringView;
}) => {
  if (view === "forecast") {
    if (isPending) {
      return <ChartSkeleton label={m.budget_recurring_forecast_loading()} />;
    }
    if (isError || !forecast) {
      return <ChartUnavailable />;
    }
    return <RecurringForecastChart {...forecast} />;
  }
  if (view === "scatter") {
    if (isPending) {
      return <ChartSkeleton label={m.budget_recurring_scatter_loading()} />;
    }
    if (isError || !scatter) {
      return <ChartUnavailable />;
    }
    return <FrequencyCostChart {...scatter} />;
  }
  if (isPending) {
    return <ChartSkeleton label={m.budget_recurring_trend_loading()} />;
  }
  if (isError || !trend) {
    return <ChartUnavailable />;
  }
  return <RecurringTrendChart {...trend} />;
};

const RecurringCompanionBody = ({
  categories,
  frequency,
  isError,
  isPending,
  split,
  view,
}: {
  categories: CategoryProps | undefined;
  frequency: FrequencyProps | undefined;
  isError: boolean;
  isPending: boolean;
  split: SplitProps | undefined;
  view: RecurringCompanionView;
}) => {
  if (view === "frequency") {
    if (isPending) {
      return <ChartSkeleton label={m.budget_recurring_frequency_loading()} />;
    }
    if (isError || !frequency) {
      return <ChartUnavailable />;
    }
    return <PurchaseFrequencyChart {...frequency} />;
  }
  if (view === "split") {
    if (isPending) {
      return <ChartSkeleton label={m.budget_recurring_split_loading()} />;
    }
    if (isError || !split) {
      return <ChartUnavailable />;
    }
    return <RecurringSplitChart {...split} />;
  }
  if (isPending) {
    return <ChartSkeleton label={m.budget_recurring_categories_loading()} />;
  }
  if (isError || !categories) {
    return <ChartUnavailable />;
  }
  return <RecurringCategoryChart {...categories} />;
};

interface RecurringChartsProps {
  companion: RecurringCompanionView;
  data: RecurringData | undefined;
  isError: boolean;
  isPending: boolean;
  onCompanionChange: (view: RecurringCompanionView) => void;
  onViewChange: (view: RecurringView) => void;
  view: RecurringView;
}

/**
 * The Recurring tab's two chart positions. Every view of a position reads the
 * same response, so switching one recomputes nothing the other holds and both
 * selections stay in the URL a reader can share.
 */
export const RecurringCharts = ({
  companion,
  data,
  isError,
  isPending,
  onCompanionChange,
  onViewChange,
  view,
}: RecurringChartsProps) => {
  const trend = useMemo(
    () =>
      data ? { currency: data.currency, monthly: data.monthly } : undefined,
    [data]
  );
  const forecast = useMemo(
    () =>
      data
        ? {
            currency: data.currency,
            points: forecastSeries(data, new Date(data.asOf)),
          }
        : undefined,
    [data]
  );
  const scatter = useMemo(
    () =>
      data
        ? { currency: data.currency, points: frequencyCostPoints(data.items) }
        : undefined,
    [data]
  );
  const categories = useMemo(
    () =>
      data
        ? {
            currency: data.currency,
            rows: recurringByCategory(data.items).slice(0, MAX_CATEGORY_ROWS),
          }
        : undefined,
    [data]
  );
  const frequency = useMemo(
    () =>
      data
        ? { currency: data.currency, rows: purchaseFrequency(data.items) }
        : undefined,
    [data]
  );
  const split = useMemo(
    () =>
      data
        ? { currency: data.currency, split: spendSplit(data.monthly) }
        : undefined,
    [data]
  );

  return (
    <div className="grid grid-cols-1 gap-4 @min-[52rem]/budget:grid-cols-[2fr_1fr]">
      <div className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle className="truncate">{VIEW_TITLES[view]()}</CardTitle>
            <CardAction>
              <ToggleGroup
                aria-label={m.budget_recurring_view_switch_label()}
                onValueChange={([next]) => {
                  const chosen = RECURRING_VIEWS.find(
                    (candidate) => candidate === next
                  );
                  if (chosen) {
                    onViewChange(chosen);
                  }
                }}
                size="sm"
                spacing={0}
                value={[view]}
                variant="outline"
              >
                {RECURRING_VIEWS.map((candidate) => (
                  <ToggleGroupItem
                    className={PRESS}
                    key={candidate}
                    value={candidate}
                  >
                    {VIEW_LABELS[candidate]()}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </CardAction>
          </CardHeader>
          <CardContent className={CHART_BODY}>
            <RecurringPrimaryBody
              forecast={forecast}
              isError={isError}
              isPending={isPending}
              scatter={scatter}
              trend={trend}
              view={view}
            />
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        <Card>
          <CardHeader>
            {/* The trigger already names the view; a title beside it would
                print the same words twice in a narrow header. */}
            <Select
              onValueChange={(next) => {
                const chosen = RECURRING_COMPANION_VIEWS.find(
                  (candidate) => candidate === next
                );
                if (chosen) {
                  onCompanionChange(chosen);
                }
              }}
              value={companion}
            >
              <SelectTrigger
                aria-label={m.budget_companion_switch_label()}
                className={PRESS}
                size="compact"
              />
              <SelectContent>
                <SelectGroup>
                  {RECURRING_COMPANION_VIEWS.map((candidate, position) => (
                    <SelectItem
                      index={position}
                      key={candidate}
                      value={candidate}
                    >
                      {COMPANION_LABELS[candidate]()}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className={CHART_BODY}>
            <RecurringCompanionBody
              categories={categories}
              frequency={frequency}
              isError={isError}
              isPending={isPending}
              split={split}
              view={companion}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

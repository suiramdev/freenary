import { Skeleton } from "@freenary/ui/components/skeleton";

import { m } from "@/paraglide/messages.js";

import { spendingPace } from "../model/dashboard";
import type { CashFlow } from "../model/dashboard";
import type { WidgetQuery } from "../model/widget-query";
import { SpendingPaceChart } from "./spending-pace-chart";
import {
  WidgetCard,
  WidgetEmpty,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

const MIN_POINTS_FOR_A_LINE = 2;

const PaceBody = ({
  current,
  previous,
  today,
}: {
  current: CashFlow;
  previous: CashFlow;
  today: Date;
}) => {
  const pace = spendingPace(current.periods, previous.periods, today);

  if (pace.points.length < MIN_POINTS_FOR_A_LINE) {
    return <WidgetEmpty>{m.home_pace_empty()}</WidgetEmpty>;
  }

  return (
    <SpendingPaceChart
      currency={current.currency}
      points={pace.points}
      previousMonthTotalMinor={pace.previousMonthTotalMinor}
      today={today}
    />
  );
};

export const SpendingPaceCard = ({
  className,
  current,
  previous,
  today,
}: {
  className?: string;
  current: WidgetQuery<CashFlow>;
  previous: WidgetQuery<CashFlow>;
  today: Date;
}) => {
  const isError = current.isError || previous.isError;
  const isPending = (current.isPending || previous.isPending) && !isError;

  return (
    <WidgetCard
      className={className}
      headingLevel="h3"
      title={m.home_pace_title()}
    >
      {isPending ? (
        <WidgetLoading label={m.home_spent_loading()}>
          <Skeleton className="h-32" />
          <Skeleton className="h-4 w-56" />
        </WidgetLoading>
      ) : null}
      {isError ? (
        <WidgetError
          isRetrying={current.isRetrying || previous.isRetrying}
          message={m.home_spent_error()}
          onRetry={() => {
            current.handleRetry();
            previous.handleRetry();
          }}
        />
      ) : null}
      {current.data && previous.data && !isError ? (
        <PaceBody
          current={current.data}
          previous={previous.data}
          today={today}
        />
      ) : null}
    </WidgetCard>
  );
};

import { Skeleton } from "@freenary/ui/components/skeleton";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiSubtractLine,
} from "@remixicon/react";
import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import { spendingPace } from "../model/dashboard";
import type { SpendingPace } from "../model/dashboard";
import type { WidgetQuery } from "../model/widget-query";
import { SpendingPaceChart } from "./spending-pace-chart";
import {
  HeadlineAmount,
  WidgetAction,
  WidgetCard,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

interface CashFlow {
  currency: string;
  periods: { incoming: number; label: string; outgoing: number }[];
}

const MIN_POINTS_FOR_A_LINE = 2;

const PaceSkeleton = () => (
  <WidgetLoading label={m.home_spent_loading()}>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-5 w-64 max-w-full" />
    </div>
    <Skeleton className="h-32" />
    <Skeleton className="h-4 w-56" />
  </WidgetLoading>
);

const PaceComparison = ({
  currency,
  pace,
}: {
  currency: string;
  pace: SpendingPace;
}) => {
  const difference = pace.currentToDateMinor - pace.previousToDateMinor;
  const amount = formatCurrency(Math.abs(difference), currency);

  if (difference === 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <RiSubtractLine aria-hidden="true" className="size-4 shrink-0" />
        {m.home_spent_same()}
      </p>
    );
  }

  const Icon = difference < 0 ? RiArrowDownLine : RiArrowUpLine;

  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {difference < 0
        ? m.home_spent_less({ amount })
        : m.home_spent_more({ amount })}
    </p>
  );
};

const SpentBody = ({
  current,
  previous,
  today,
}: {
  current: CashFlow;
  previous: CashFlow;
  today: Date;
}) => {
  const pace = spendingPace(current.periods, previous.periods, today);

  return (
    <>
      <div className="flex flex-col gap-1">
        <HeadlineAmount>
          {formatCurrency(pace.monthTotalMinor, current.currency)}
        </HeadlineAmount>
        <PaceComparison currency={current.currency} pace={pace} />
      </div>
      {pace.points.length >= MIN_POINTS_FOR_A_LINE ? (
        <SpendingPaceChart
          currency={current.currency}
          points={pace.points}
          previousMonthTotalMinor={pace.previousMonthTotalMinor}
          today={today}
        />
      ) : null}
    </>
  );
};

export const SpentThisMonthCard = ({
  current,
  previous,
  today,
}: {
  current: WidgetQuery<CashFlow>;
  previous: WidgetQuery<CashFlow>;
  today: Date;
}) => {
  const isPending = current.isPending || previous.isPending;
  const isError = current.isError || previous.isError;

  return (
    <WidgetCard
      action={
        <WidgetAction>
          <Link to="/budget/transactions">{m.nav_budget_transactions()}</Link>
        </WidgetAction>
      }
      title={m.home_spent_title()}
    >
      {isPending && !isError ? <PaceSkeleton /> : null}
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
        <SpentBody
          current={current.data}
          previous={previous.data}
          today={today}
        />
      ) : null}
    </WidgetCard>
  );
};

import { Skeleton } from "@freenary/ui/components/skeleton";
import { cn } from "@freenary/ui/lib/utils";
import { Link } from "@tanstack/react-router";

import type { RecurringData } from "@/entities/recurring";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import { availableToSpend } from "../model/dashboard";
import type { WidgetQuery } from "../model/widget-query";
import {
  HeadlineAmount,
  WidgetAction,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

const MONTH_END_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
};

const AvailableSkeleton = () => (
  <WidgetLoading label={m.home_available_loading()}>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-5 w-64 max-w-full" />
    </div>
  </WidgetLoading>
);

const AvailableBody = ({
  recurring,
  today,
}: {
  recurring: RecurringData;
  today: Date;
}) => {
  const available = availableToSpend(recurring, today);

  if (available === null) {
    return <WidgetEmpty>{m.home_available_empty()}</WidgetEmpty>;
  }

  const { currency } = recurring;
  const monthEnd = available.monthEnd.toLocaleDateString(
    getLocale(),
    MONTH_END_FORMAT
  );

  return (
    <div className="flex flex-col gap-1">
      <HeadlineAmount
        className={cn(available.availableMinor < 0 && "text-destructive")}
      >
        {formatCurrency(available.availableMinor, currency)}
      </HeadlineAmount>
      <p className="text-muted-foreground text-sm text-pretty">
        {available.availableMinor < 0
          ? m.home_available_short({ date: monthEnd })
          : m.home_available_description({ date: monthEnd })}
      </p>
    </div>
  );
};

export const AvailableToSpendCard = ({
  query,
  today,
}: {
  query: WidgetQuery<RecurringData>;
  today: Date;
}) => (
  <WidgetCard
    action={
      <WidgetAction>
        <Link to="/budget/recurring">{m.nav_budget_recurring()}</Link>
      </WidgetAction>
    }
    title={m.home_available_title()}
  >
    {query.isPending ? <AvailableSkeleton /> : null}
    {query.isError ? (
      <WidgetError
        isRetrying={query.isRetrying}
        message={m.home_available_error()}
        onRetry={query.handleRetry}
      />
    ) : null}
    {query.data ? <AvailableBody recurring={query.data} today={today} /> : null}
  </WidgetCard>
);

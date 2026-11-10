import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

import { CategoryIcon, categoryLabel } from "@/entities/category";
import type { RecurringData, UpcomingPayment } from "@/entities/recurring";
import { m } from "@/paraglide/messages.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import {
  commitmentsDue,
  UPCOMING_ROWS_SHOWN,
  UPCOMING_WINDOW_DAYS,
} from "../model/dashboard";
import type { WidgetQuery } from "../model/widget-query";
import {
  WidgetAction,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

const dueLabel = (daysAway: number): string => {
  if (daysAway === 0) {
    return m.budget_recurring_upcoming_today();
  }

  if (daysAway === 1) {
    return m.budget_recurring_upcoming_tomorrow();
  }

  return m.budget_recurring_upcoming_in_days({ count: daysAway });
};

const RowSkeleton = () => (
  <div className="flex items-center gap-3">
    <Skeleton className="size-8 shrink-0 rounded-full" />
    <div className="flex flex-1 flex-col gap-1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3.5 w-20" />
    </div>
    <Skeleton className="h-4 w-16" />
  </div>
);

const SKELETON_ROWS = 3;

const UpcomingSkeleton = () => (
  <WidgetLoading label={m.home_upcoming_loading()}>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <RowSkeleton key={index} />
    ))}
  </WidgetLoading>
);

const PaymentRow = ({ payment }: { payment: UpcomingPayment }) => (
  <li className="flex items-center gap-3">
    <CategoryIcon
      {...predefinedCategoryAppearance(payment.category)}
      className="size-8 [&_svg]:size-4"
    />
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="text-sm break-words">{payment.label}</span>
      <span className="text-muted-foreground text-xs">
        {dueLabel(payment.daysAway)}
        <span aria-hidden="true"> · </span>
        <span className="sr-only">, </span>
        {categoryLabel(payment.category)}
      </span>
    </div>
    <span className="text-sm tabular-nums">
      {formatCurrency(payment.amountMinor, payment.currency)}
    </span>
  </li>
);

const UpcomingBody = ({
  recurring,
  today,
}: {
  recurring: RecurringData;
  today: Date;
}) => {
  const payments = commitmentsDue(recurring, today, UPCOMING_WINDOW_DAYS);

  if (payments.length === 0) {
    return (
      <WidgetEmpty>
        {m.home_upcoming_empty({ days: UPCOMING_WINDOW_DAYS })}
      </WidgetEmpty>
    );
  }

  const inCurrency = payments.filter(
    (payment) => payment.currency === recurring.currency
  );

  const totalMinor = inCurrency.reduce(
    (total, payment) => total + payment.amountMinor,
    0
  );

  return (
    <>
      {inCurrency.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {m.home_upcoming_summary({
            amount: formatCurrency(totalMinor, recurring.currency),
            count: inCurrency.length,
            days: UPCOMING_WINDOW_DAYS,
          })}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {payments.slice(0, UPCOMING_ROWS_SHOWN).map((payment) => (
          <PaymentRow key={payment.id} payment={payment} />
        ))}
      </ul>
      {payments.length > UPCOMING_ROWS_SHOWN ? (
        <p className="text-muted-foreground text-xs">
          {m.home_upcoming_more({
            count: payments.length - UPCOMING_ROWS_SHOWN,
          })}
        </p>
      ) : null}
    </>
  );
};

export const UpcomingPaymentsCard = ({
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
    title={m.home_upcoming_title()}
  >
    {query.isPending ? <UpcomingSkeleton /> : null}
    {query.isError ? (
      <WidgetError
        isRetrying={query.isRetrying}
        message={m.home_upcoming_error()}
        onRetry={query.handleRetry}
      />
    ) : null}
    {query.data ? <UpcomingBody recurring={query.data} today={today} /> : null}
  </WidgetCard>
);

import { Skeleton } from "@freenary/ui/components/skeleton";
import { cn } from "@freenary/ui/lib/utils";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { formatCurrency } from "@/shared/lib/format-currency";
import { SyncButton } from "@/shared/ui/sync-button";

import type { PortfolioOverview, WidgetQuery } from "../model/widget-query";
import { WidgetError } from "./widget-card";

const UPDATED_AT_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "long",
};

const HeroAmount = ({ overview }: { overview: PortfolioOverview }) => {
  const { balanceMinor, currency } = overview.currentAccounts;

  if (balanceMinor === null) {
    return (
      <>
        <p className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
          <span aria-hidden="true">—</span>
        </p>
        <p className="text-muted-foreground text-sm text-pretty">
          {m.home_available_empty()}
        </p>
      </>
    );
  }

  return (
    <p
      className={cn(
        "text-4xl leading-none font-semibold tracking-tight tabular-nums sm:text-5xl",
        balanceMinor < 0 && "text-destructive"
      )}
    >
      {formatCurrency(balanceMinor, currency)}
    </p>
  );
};

const UpdatedAt = ({ overview }: { overview: PortfolioOverview }) => {
  const { balancesAt } = overview.currentAccounts;

  if (!balancesAt) {
    return null;
  }

  const date = new Date(balancesAt).toLocaleString(
    getLocale(),
    UPDATED_AT_FORMAT
  );

  return (
    <p className="text-muted-foreground text-sm">
      {m.home_balance_updated({ date })}
    </p>
  );
};

export const BalanceHero = ({
  isSyncing,
  onSync,
  query,
}: {
  isSyncing: boolean;
  onSync: () => void;
  query: WidgetQuery<PortfolioOverview>;
}) => (
  <section
    aria-labelledby="home-balance-title"
    className="flex flex-col gap-3 pt-2"
  >
    <h2
      className="text-muted-foreground text-sm font-medium"
      id="home-balance-title"
    >
      {m.home_balance_title()}
    </h2>
    {query.isPending ? (
      <div aria-busy="true" className="flex flex-col gap-3">
        <output className="sr-only">{m.home_balance_loading()}</output>
        <Skeleton
          aria-hidden="true"
          className="h-9 w-56 max-w-full sm:h-12 sm:w-64"
        />
      </div>
    ) : null}
    {query.isError ? (
      <WidgetError
        isRetrying={query.isRetrying}
        message={m.home_balance_error()}
        onRetry={query.handleRetry}
      />
    ) : null}
    {query.data ? <HeroAmount overview={query.data} /> : null}
    <div className="flex min-h-9 items-center gap-1">
      {query.data ? <UpdatedAt overview={query.data} /> : null}
      <SyncButton
        isSyncing={isSyncing}
        label={m.budget_sync_now()}
        onSync={onSync}
        size="icon-compact"
      />
    </div>
  </section>
);

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useSyncAccounts } from "@/features/account-sync";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/shared/api";
import { NoBankAccount } from "@/shared/ui/no-bank-account";

import { latestTransactionsQueryOptions } from "../api/latest-transactions-query";
import { dashboardMonths, RECENT_TRANSACTIONS_SHOWN } from "../model/dashboard";
import { firstPageWidgetQuery, widgetQuery } from "../model/widget-query";
import { AccountStrip } from "./account-strip";
import { AvailableToSpendCard } from "./available-to-spend-card";
import { BalanceHero } from "./balance-hero";
import { InvestmentsCard } from "./investments-card";
import { NetWorthCard } from "./net-worth-card";
import { RecentTransactionsCard } from "./recent-transactions-card";
import { SpendingPaceCard } from "./spending-pace-card";
import { SpentThisMonthCard } from "./spent-this-month-card";
import { TopCategoriesCard } from "./top-categories-card";
import { UpcomingPaymentsCard } from "./upcoming-payments-card";

export const HomePage = () => {
  const today = new Date();
  const { current, previous } = dashboardMonths(today);
  const { isSyncing, sync } = useSyncAccounts();

  const overview = widgetQuery(
    useQuery(orpc.portfolio.getOverview.queryOptions())
  );

  const recurring = widgetQuery(
    useQuery(orpc.budget.getRecurring.queryOptions())
  );

  const spentNow = widgetQuery(
    useQuery(orpc.budget.getCashFlow.queryOptions({ input: current }))
  );

  const spentBefore = widgetQuery(
    useQuery(orpc.budget.getCashFlow.queryOptions({ input: previous }))
  );

  const recentTransactions = firstPageWidgetQuery(
    useInfiniteQuery(
      latestTransactionsQueryOptions({ pageSize: RECENT_TRANSACTIONS_SHOWN })
    ),
    (page) => page.transactions
  );

  const breakdown = widgetQuery(
    useQuery(
      orpc.budget.getSpendingBreakdown.queryOptions({
        input: { ...current, aggregation: "total" },
      })
    )
  );

  if (overview.data?.accounts.length === 0) {
    return (
      <NoBankAccount
        actionLabel={m.budget_no_account_cta()}
        description={m.home_no_account_description()}
        title={m.home_no_account_title()}
      />
    );
  }

  return (
    <div className="@container/home flex flex-1 flex-col gap-8 p-4">
      <h1 className="sr-only">{m.nav_home()}</h1>
      <div className="flex flex-col gap-6">
        <BalanceHero
          isSyncing={isSyncing}
          onSync={() => sync({ force: true })}
          query={overview}
        />
        <AccountStrip query={overview} />
      </div>
      <div className="grid grid-cols-1 gap-4 @2xl/home:grid-cols-2">
        <RecentTransactionsCard query={recentTransactions} today={today} />
        <div className="flex flex-col gap-4">
          <AvailableToSpendCard query={recurring} today={today} />
          <SpentThisMonthCard
            current={spentNow}
            previous={spentBefore}
            today={today}
          />
        </div>
        <UpcomingPaymentsCard query={recurring} today={today} />
        <TopCategoriesCard query={breakdown} />
      </div>
      <section
        aria-labelledby="home-insights-title"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold" id="home-insights-title">
            {m.home_insights_title()}
          </h2>
          <p className="text-muted-foreground text-sm text-pretty">
            {m.home_insights_description()}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 @2xl/home:grid-cols-2">
          <NetWorthCard className="@2xl/home:col-span-2" query={overview} />
          <SpendingPaceCard
            current={spentNow}
            previous={spentBefore}
            today={today}
          />
          <InvestmentsCard query={overview} />
        </div>
      </section>
    </div>
  );
};

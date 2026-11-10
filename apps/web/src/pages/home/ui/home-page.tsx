import { useQuery } from "@tanstack/react-query";

import { useSyncAccounts } from "@/features/account-sync";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/shared/api";
import { NoBankAccount } from "@/shared/ui/no-bank-account";
import { SyncButton } from "@/shared/ui/sync-button";

import { dashboardMonths } from "../model/dashboard";
import { widgetQuery } from "../model/widget-query";
import { AccountsCard } from "./accounts-card";
import { AvailableToSpendCard } from "./available-to-spend-card";
import { InvestmentsCard } from "./investments-card";
import { NetWorthCard } from "./net-worth-card";
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
    <div className="@container/home flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-end gap-4">
        <h1 className="sr-only">{m.nav_home()}</h1>
        <SyncButton
          isSyncing={isSyncing}
          label={m.budget_sync_now()}
          onSync={() => sync({ force: true })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 @2xl/home:grid-cols-2">
        <NetWorthCard className="@2xl/home:col-span-2" query={overview} />
        <AvailableToSpendCard query={recurring} today={today} />
        <SpentThisMonthCard
          current={spentNow}
          previous={spentBefore}
          today={today}
        />
        <UpcomingPaymentsCard query={recurring} today={today} />
        <TopCategoriesCard query={breakdown} />
        <InvestmentsCard query={overview} />
        <AccountsCard query={overview} />
      </div>
    </div>
  );
};

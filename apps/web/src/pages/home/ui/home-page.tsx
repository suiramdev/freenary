import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { orpc } from "@/shared/api";
import { startOfDay } from "@/shared/lib/calendar-day";
import { NoBankAccount } from "@/shared/ui/no-bank-account";
import { AccountStrip, DashboardGrid } from "@/widgets/dashboard";

import { HOME_WIDGETS } from "../model/home-widgets";

const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: "long" };

export const HomePage = () => {
  const now = useMemo(() => new Date(), []);
  const today = startOfDay(now);
  const overview = useQuery(orpc.portfolio.getOverview.queryOptions());

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
    <div className="@container/home mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-4">
      <h1 className="sr-only">{m.nav_home()}</h1>
      <AccountStrip />
      <section
        aria-labelledby="home-overview-title"
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-sm font-medium" id="home-overview-title">
            {m.home_overview_title()}
          </h2>
          <span className="text-muted-foreground text-xs">
            {m.home_overview_hint({
              month: now.toLocaleDateString(getLocale(), MONTH_FORMAT),
            })}
          </span>
        </div>
        <DashboardGrid today={today} widgets={HOME_WIDGETS} />
      </section>
    </div>
  );
};

import { Skeleton } from "@freenary/ui/components/skeleton";
import { cn } from "@freenary/ui/lib/utils";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import { ASSET_CLASS_COLORS, ASSET_CLASS_LABELS } from "../model/asset-classes";
import type { PortfolioOverview, WidgetQuery } from "../model/widget-query";
import {
  HeadlineAmount,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

type NetWorth = PortfolioOverview["netWorth"];

const SHARE_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 0,
  style: "percent",
};

const BALANCE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "long",
};

const LEGEND_SKELETON_ROWS = 3;

const PERCENT = 100;

const NetWorthSkeleton = () => (
  <WidgetLoading label={m.home_net_worth_loading()}>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-56" />
    </div>
    <Skeleton className="h-2.5 w-full rounded-full" />
    <div className="grid grid-cols-2 gap-x-8 gap-y-3 @lg/home:grid-cols-4">
      {Array.from({ length: LEGEND_SKELETON_ROWS }, (_, index) => (
        <div className="flex flex-col gap-1" key={index}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  </WidgetLoading>
);

const AllocationBar = ({ netWorth }: { netWorth: NetWorth }) => (
  <div
    aria-hidden="true"
    className="bg-muted flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
  >
    {netWorth.assetClasses.map(({ amountMinor, assetClass }) => (
      <span
        className="h-full first:rounded-s-full last:rounded-e-full"
        key={assetClass}
        style={{
          backgroundColor: ASSET_CLASS_COLORS[assetClass],
          width: `${(amountMinor / netWorth.assetsMinor) * PERCENT}%`,
        }}
      />
    ))}
  </div>
);

const AllocationLegend = ({
  currency,
  netWorth,
}: {
  currency: string;
  netWorth: NetWorth;
}) => {
  const percent = new Intl.NumberFormat(getLocale(), SHARE_FORMAT);

  return (
    <ul className="grid grid-cols-2 gap-x-8 gap-y-3 @lg/home:grid-cols-4">
      {netWorth.assetClasses.map(({ amountMinor, assetClass }) => (
        <li className="flex min-w-0 flex-col gap-0.5" key={assetClass}>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: ASSET_CLASS_COLORS[assetClass] }}
            />
            {ASSET_CLASS_LABELS[assetClass]()}
            <span className="tabular-nums">
              {percent.format(amountMinor / netWorth.assetsMinor)}
            </span>
          </span>
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(amountMinor, currency)}
          </span>
        </li>
      ))}
    </ul>
  );
};

const NetWorthBody = ({ overview }: { overview: PortfolioOverview }) => {
  const { currency, netWorth } = overview;

  if (netWorth.netWorthMinor === null) {
    return <WidgetEmpty>{m.home_net_worth_empty()}</WidgetEmpty>;
  }

  const balancesAt = netWorth.balancesAt
    ? new Date(netWorth.balancesAt).toLocaleString(
        getLocale(),
        BALANCE_DATE_FORMAT
      )
    : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <HeadlineAmount
          className={cn(netWorth.netWorthMinor < 0 && "text-destructive")}
        >
          {formatCurrency(netWorth.netWorthMinor, currency)}
        </HeadlineAmount>
        {netWorth.liabilitiesMinor > 0 ? (
          <p className="text-muted-foreground text-sm">
            {m.home_net_worth_assets_and_debts({
              assets: formatCurrency(netWorth.assetsMinor, currency),
              debts: formatCurrency(netWorth.liabilitiesMinor, currency),
            })}
          </p>
        ) : null}
      </div>
      {netWorth.assetsMinor > 0 ? (
        <>
          <AllocationBar netWorth={netWorth} />
          <AllocationLegend currency={currency} netWorth={netWorth} />
        </>
      ) : null}
      {balancesAt || netWorth.excludedAccountCount > 0 ? (
        <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
          {balancesAt ? (
            <p>{m.home_net_worth_balances_at({ date: balancesAt })}</p>
          ) : null}
          {netWorth.excludedAccountCount > 0 ? (
            <p>
              {m.home_net_worth_excluded({
                count: netWorth.excludedAccountCount,
                currency,
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export const NetWorthCard = ({
  className,
  query,
}: {
  className?: string;
  query: WidgetQuery<PortfolioOverview>;
}) => (
  <WidgetCard
    className={className}
    headingLevel="h3"
    title={m.home_net_worth_title()}
  >
    {query.isPending ? <NetWorthSkeleton /> : null}
    {query.isError ? (
      <WidgetError
        isRetrying={query.isRetrying}
        message={m.home_net_worth_error()}
        onRetry={query.handleRetry}
      />
    ) : null}
    {query.data ? <NetWorthBody overview={query.data} /> : null}
  </WidgetCard>
);

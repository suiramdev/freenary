import { Skeleton } from "@freenary/ui/components/skeleton";
import { cn } from "@freenary/ui/lib/utils";
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import {
  formatCurrency,
  formatSignedCurrency,
} from "@/shared/lib/format-currency";

import type { PortfolioOverview, WidgetQuery } from "../model/widget-query";
import {
  HeadlineAmount,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

type Holdings = PortfolioOverview["holdings"];

const GAIN_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
  style: "percent",
};

const gainTone = (gainMinor: number): string | undefined => {
  if (gainMinor > 0) {
    return "text-success";
  }

  return gainMinor < 0 ? "text-destructive" : undefined;
};

const GainLine = ({
  currency,
  holdings,
}: {
  currency: string;
  holdings: Holdings;
}) => {
  const gainMinor = holdings.unrealisedGainMinor;
  const costMinor = holdings.costBasisMinor;

  if (gainMinor === null || costMinor === null || costMinor <= 0) {
    return null;
  }

  const ratio = new Intl.NumberFormat(getLocale(), GAIN_FORMAT).format(
    gainMinor / costMinor
  );

  const Icon = gainMinor < 0 ? RiArrowDownLine : RiArrowUpLine;

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-sm tabular-nums",
        gainTone(gainMinor)
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {gainMinor < 0
        ? m.home_investments_gain_down({
            amount: formatSignedCurrency(gainMinor, currency),
            ratio,
          })
        : m.home_investments_gain_up({
            amount: formatSignedCurrency(gainMinor, currency),
            ratio,
          })}
    </p>
  );
};

const SKELETON_ROWS = 3;

const InvestmentsSkeleton = () => (
  <WidgetLoading label={m.home_investments_loading()}>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-5 w-56 max-w-full" />
    </div>
    <div className="flex flex-col gap-2">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton className="h-5" key={index} />
      ))}
    </div>
  </WidgetLoading>
);

const InvestmentsBody = ({ overview }: { overview: PortfolioOverview }) => {
  const { currency, holdings, netWorth } = overview;
  const investmentsMinor =
    netWorth.assetClasses.find((entry) => entry.assetClass === "investments")
      ?.amountMinor ?? holdings.valuationMinor;

  if (investmentsMinor <= 0 && holdings.holdingCount === 0) {
    return <WidgetEmpty>{m.home_investments_empty()}</WidgetEmpty>;
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <HeadlineAmount>
          {formatCurrency(investmentsMinor, currency)}
        </HeadlineAmount>
        <GainLine currency={currency} holdings={holdings} />
      </div>
      {holdings.topHoldings.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs">
            {m.home_investments_top({ count: holdings.holdingCount })}
          </h3>
          <ul className="flex flex-col gap-2">
            {holdings.topHoldings.map((holding) => (
              <li
                className="flex items-baseline gap-3 text-sm"
                key={holding.id}
              >
                <span className="min-w-0 flex-1 break-words">
                  {holding.label}
                </span>
                {holding.unrealisedGainMinor === null ? null : (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      gainTone(holding.unrealisedGainMinor)
                    )}
                  >
                    {formatSignedCurrency(
                      holding.unrealisedGainMinor,
                      currency
                    )}
                  </span>
                )}
                <span className="tabular-nums">
                  {formatCurrency(holding.valuationMinor, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
};

export const InvestmentsCard = ({
  query,
}: {
  query: WidgetQuery<PortfolioOverview>;
}) => (
  <WidgetCard title={m.home_investments_title()}>
    {query.isPending ? <InvestmentsSkeleton /> : null}
    {query.isError ? (
      <WidgetError
        isRetrying={query.isRetrying}
        message={m.home_investments_error()}
        onRetry={query.handleRetry}
      />
    ) : null}
    {query.data ? <InvestmentsBody overview={query.data} /> : null}
  </WidgetCard>
);

import { Skeleton } from "@freenary/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import { ACCOUNT_TYPE_LABELS } from "../model/account-types";
import type { PortfolioOverview, WidgetQuery } from "../model/widget-query";
import {
  WidgetAction,
  WidgetCard,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

type Account = PortfolioOverview["accounts"][number];

const SKELETON_ROWS = 3;

const AccountsSkeleton = () => (
  <WidgetLoading label={m.home_accounts_loading()}>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <div className="flex items-center gap-3" key={index}>
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </WidgetLoading>
);

const AccountBalance = ({ account }: { account: Account }) => {
  if (account.balanceMinor === null || account.currency === null) {
    return (
      <span className="text-muted-foreground text-sm">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{m.home_accounts_no_balance()}</span>
      </span>
    );
  }

  return (
    <span className="text-sm tabular-nums">
      {formatCurrency(account.balanceMinor, account.currency)}
    </span>
  );
};

const AccountRow = ({ account }: { account: Account }) => (
  <li className="flex items-center gap-3">
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="text-sm break-words">
        {account.name ?? ACCOUNT_TYPE_LABELS[account.type]()}
      </span>
      <span className="text-muted-foreground text-xs break-words">
        {m.home_accounts_meta({
          institution: account.institutionName,
          type: ACCOUNT_TYPE_LABELS[account.type](),
        })}
      </span>
    </div>
    <AccountBalance account={account} />
  </li>
);

export const AccountsCard = ({
  query,
}: {
  query: WidgetQuery<PortfolioOverview>;
}) => (
  <WidgetCard
    action={
      <WidgetAction>
        <Link search={{ section: "connections" }} to="/settings">
          {m.home_link_connections()}
        </Link>
      </WidgetAction>
    }
    title={m.home_accounts_title()}
  >
    {query.isPending ? <AccountsSkeleton /> : null}
    {query.isError ? (
      <WidgetError
        isRetrying={query.isRetrying}
        message={m.home_accounts_error()}
        onRetry={query.handleRetry}
      />
    ) : null}
    {query.data ? (
      <ul className="flex flex-col gap-3">
        {query.data.accounts.map((account) => (
          <AccountRow account={account} key={account.id} />
        ))}
      </ul>
    ) : null}
  </WidgetCard>
);

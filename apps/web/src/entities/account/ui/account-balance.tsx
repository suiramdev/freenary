import { cn } from "@freenary/ui/lib/utils";

import { m } from "@/paraglide/messages.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import { BALANCE_SEPARATOR, heldBalancesOf } from "../model/account-types";
import type { PortfolioAccount } from "../model/account-types";

export const AccountBalance = ({
  account,
  className,
  stacked = false,
}: {
  account: PortfolioAccount;
  className?: string;
  stacked?: boolean;
}) => {
  const held = heldBalancesOf(account);

  if (held.length === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{m.home_accounts_no_balance()}</span>
      </span>
    );
  }

  return (
    <span className={cn("tabular-nums", stacked && "flex flex-col", className)}>
      {held.map((balance, position) => (
        <span className="whitespace-nowrap" key={balance.currency}>
          {position > 0 && !stacked ? BALANCE_SEPARATOR : null}
          {formatCurrency(balance.balanceMinor, balance.currency)}
        </span>
      ))}
    </span>
  );
};

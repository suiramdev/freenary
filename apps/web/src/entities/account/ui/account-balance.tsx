import { cn } from "@freenary/ui/lib/utils";

import { m } from "@/paraglide/messages.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import type { PortfolioAccount } from "../model/account-types";

export const AccountBalance = ({
  account,
  className,
}: {
  account: PortfolioAccount;
  className?: string;
}) => {
  if (account.balanceMinor === null || account.currency === null) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{m.home_accounts_no_balance()}</span>
      </span>
    );
  }

  return (
    <span className={cn("tabular-nums", className)}>
      {formatCurrency(account.balanceMinor, account.currency)}
    </span>
  );
};

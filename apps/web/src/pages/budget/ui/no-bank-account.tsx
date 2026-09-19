import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { RiWalletLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages.js";
import { BANK_ACCOUNTS_ANCHOR } from "@/shared/config";

export const NoBankAccount = () => (
  <div className="flex flex-1 flex-col items-center justify-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RiWalletLine />
        </EmptyMedia>
        <EmptyTitle>{m.budget_no_account_title()}</EmptyTitle>
        <EmptyDescription>{m.budget_no_account_description()}</EmptyDescription>
      </EmptyHeader>
      <Button asChild>
        <Link hash={BANK_ACCOUNTS_ANCHOR} to="/settings">
          {m.budget_no_account_cta()}
        </Link>
      </Button>
    </Empty>
  </div>
);

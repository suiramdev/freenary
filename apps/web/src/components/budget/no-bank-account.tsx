import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { Wallet } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { BANK_ACCOUNTS_ANCHOR } from "@/components/settings/bank-accounts-section";
import { m } from "@/paraglide/messages.js";

export const NoBankAccount = () => (
  <div className="flex flex-1 flex-col items-center justify-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Wallet />
        </EmptyMedia>
        <EmptyTitle>{m.budget_no_account_title()}</EmptyTitle>
        <EmptyDescription>{m.budget_no_account_description()}</EmptyDescription>
      </EmptyHeader>
      {/* Onboarding is unreachable once completed — banks live in Settings. */}
      <Button render={<Link hash={BANK_ACCOUNTS_ANCHOR} to="/settings" />}>
        {m.budget_no_account_cta()}
      </Button>
    </Empty>
  </div>
);

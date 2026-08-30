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

export const NoBankAccount = () => (
  <div className="flex flex-1 flex-col items-center justify-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Wallet />
        </EmptyMedia>
        <EmptyTitle>Connect a bank account</EmptyTitle>
        <EmptyDescription>
          Link a bank account to see where your money comes from and where it
          goes. Your transactions will appear here automatically.
        </EmptyDescription>
      </EmptyHeader>
      {/* Onboarding is unreachable once completed — linking lives in Settings. */}
      <Button render={<Link hash={BANK_ACCOUNTS_ANCHOR} to="/settings" />}>
        Link a bank
      </Button>
    </Empty>
  </div>
);

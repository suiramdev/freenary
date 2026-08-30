import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { BankIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { BankCard } from "@/components/bank/bank-card";
import { BankListSkeleton } from "@/components/bank/bank-list-skeleton";
import type { BankInstitution } from "@/hooks/bank/use-bank-connections";

interface BankListProps {
  banks: BankInstitution[];
  /** Institutions with a linked connection — a badge instead of a button. */
  connectedIds: ReadonlySet<string>;
  connecting: string | null;
  hasSearch: boolean;
  isError: boolean;
  isPending: boolean;
  onConnect: (bank: BankInstitution) => void;
}

export const BankList = ({
  banks,
  connectedIds,
  connecting,
  hasSearch,
  isError,
  isPending,
  onConnect,
}: BankListProps) => {
  if (isPending) {
    return (
      <div aria-busy="true" className="max-h-64 overflow-y-auto">
        <output className="sr-only">Loading banks</output>
        <div aria-hidden="true">
          <BankListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  // Only when there is nothing to fall back on: a refetch failure must not
  // wipe the institutions already on screen.
  if (isError && banks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Could not load banks</EmptyTitle>
          <EmptyDescription>Reload the page to try again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (banks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BankIcon />
          </EmptyMedia>
          <EmptyTitle>
            {hasSearch ? "No banks match your search" : "No banks available"}
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    // A real list rather than ItemGroup: its `div[role=list]` cannot hold the
    // `<li>` rows without tripping HTML's content model.
    <ul className="flex max-h-64 flex-col gap-2.5 overflow-y-auto">
      {banks.map((bank) => (
        <BankCard
          key={bank.id}
          bic={bank.bic}
          connected={connectedIds.has(bank.id)}
          connecting={connecting === bank.id}
          logo={bank.logo}
          name={bank.name}
          onConnect={() => onConnect(bank)}
        />
      ))}
    </ul>
  );
};

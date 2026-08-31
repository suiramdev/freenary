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
import type { BankRow } from "@/lib/bank/bank-rows";

interface BankListProps {
  connecting: string | null;
  /** The connection currently being disconnected, if any. */
  disconnectingId: string | null;
  hasSearch: boolean;
  isError: boolean;
  isPending: boolean;
  onConnect: (row: BankRow) => void;
  onDisconnect: (connectionId: string) => void;
  rows: BankRow[];
}

export const BankList = ({
  connecting,
  disconnectingId,
  hasSearch,
  isError,
  isPending,
  onConnect,
  onDisconnect,
  rows,
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

  // Connected rows alone are not the list: a bank to connect can only come
  // from an institution, so their absence is the failure worth reporting.
  if (isError && !rows.some((row) => row.institution)) {
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

  if (rows.length === 0) {
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
      {rows.map((row) => (
        <BankCard
          key={row.id}
          connecting={connecting === row.institution?.id}
          disconnecting={disconnectingId === row.connection?.id}
          onConnect={() => onConnect(row)}
          onDisconnect={() => {
            if (row.connection) {
              onDisconnect(row.connection.id);
            }
          }}
          row={row}
        />
      ))}
    </ul>
  );
};

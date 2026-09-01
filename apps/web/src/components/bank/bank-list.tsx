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
import { m } from "@/paraglide/messages.js";

interface BankListProps {
  connecting: string | null;
  /** The connection currently being disconnected, if any. */
  disconnectingId: string | null;
  hasSearch: boolean;
  /** The institutions could not be loaded and none are cached. */
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
        <output className="sr-only">{m.bank_list_loading()}</output>
        <div aria-hidden="true">
          <BankListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>{m.bank_list_error_title()}</EmptyTitle>
          <EmptyDescription>
            {m.bank_error_retry_description()}
          </EmptyDescription>
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
            {hasSearch
              ? m.bank_list_empty_search_title()
              : m.bank_list_empty_title()}
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

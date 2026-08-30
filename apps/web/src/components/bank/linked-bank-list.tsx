import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@freenary/ui/components/item";
import { BankIcon } from "@phosphor-icons/react";

import { BankListSkeleton } from "@/components/bank/bank-list-skeleton";
import { UnlinkBankDialog } from "@/components/bank/unlink-bank-dialog";
import type { BankConnection } from "@/hooks/bank/use-bank-connections";

/** What the row says beneath the bank name, most useful fact first. */
const summaryOf = (connection: BankConnection): string => {
  const accountCount = connection.accounts.length;
  const accounts = `${accountCount} account${accountCount === 1 ? "" : "s"}`;
  if (connection.status !== "ACTIVE") {
    return `${accounts} · Reconnect to resume importing`;
  }
  return connection.lastSyncedAt
    ? `${accounts} · Synced ${connection.lastSyncedAt.toLocaleDateString()}`
    : `${accounts} · Not synced yet`;
};

interface LinkedBankListProps {
  connections: BankConnection[];
  isPending: boolean;
  isUnlinking: boolean;
  onUnlink: (connectionId: string) => void;
  unlinkingId: string | null;
}

export const LinkedBankList = ({
  connections,
  isPending,
  isUnlinking,
  onUnlink,
  unlinkingId,
}: LinkedBankListProps) => {
  if (isPending) {
    return (
      <div aria-busy="true">
        <output className="sr-only">Loading your linked banks</output>
        <div aria-hidden="true">
          <BankListSkeleton rows={1} />
        </div>
      </div>
    );
  }

  return (
    // A real list rather than ItemGroup, whose `div[role=list]` cannot hold
    // the `<li>` rows without tripping HTML's content model.
    <ul aria-label="Linked banks" className="flex flex-col gap-2.5">
      {connections.map((connection) => (
        <Item
          key={connection.id}
          render={<li />}
          className="border-primary bg-secondary"
          size="sm"
          variant="outline"
        >
          <ItemMedia className="text-muted-foreground [&_svg]:size-5">
            <BankIcon />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="block w-full truncate">
              {connection.institutionName}
            </ItemTitle>
            <ItemDescription>{summaryOf(connection)}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <UnlinkBankDialog
              accountCount={connection.accounts.length}
              institutionName={connection.institutionName}
              isUnlinking={isUnlinking && unlinkingId === connection.id}
              onConfirm={() => onUnlink(connection.id)}
            />
          </ItemActions>
        </Item>
      ))}
    </ul>
  );
};

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { BankList } from "@/components/bank/bank-list";
import { LinkedBankList } from "@/components/bank/linked-bank-list";
import { SearchInput } from "@/components/shared/search-input";
import type {
  BankConnectionReturnTo,
  BankInstitution,
} from "@/hooks/bank/use-bank-connections";
import { useBankConnections } from "@/hooks/bank/use-bank-connections";

interface BankConnectionPanelProps {
  banks: BankInstitution[];
  isBanksError: boolean;
  isBanksPending: boolean;
  /** Where the provider callback returns the user to. */
  returnTo: BankConnectionReturnTo;
}

/**
 * The one bank-linking surface, shared by onboarding and settings: the banks
 * already linked, each unlinkable, and the picker to link another.
 */
export const BankConnectionPanel = ({
  banks,
  isBanksError,
  isBanksPending,
  returnTo,
}: BankConnectionPanelProps) => {
  const [search, setSearch] = useState("");
  const {
    connect,
    connectedIds,
    connecting,
    connections,
    isConnectionsError,
    isConnectionsPending,
    isUnlinking,
    unlink,
    unlinkingId,
  } = useBankConnections({ returnTo });

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return banks;
    }
    const q = search.toLowerCase();
    return banks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.bic && b.bic.toLowerCase().includes(q))
    );
  }, [banks, search]);

  // An unread list is not an empty one: saying "no banks linked" here would
  // invite a second consent for a bank the user already has.
  const hasLinkedBlock =
    isConnectionsPending || isConnectionsError || connections.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {hasLinkedBlock ? (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-medium">Linked banks</h3>
          {isConnectionsError ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WarningCircleIcon />
                </EmptyMedia>
                <EmptyTitle>Could not load your linked banks</EmptyTitle>
                <EmptyDescription>
                  Reload the page to try again.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <LinkedBankList
              connections={connections}
              isPending={isConnectionsPending}
              isUnlinking={isUnlinking}
              onUnlink={unlink}
              unlinkingId={unlinkingId}
            />
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <h3 className="text-sm font-medium">
          {connections.length > 0 ? "Link another bank" : "Link a bank"}
        </h3>
        <SearchInput
          onChange={setSearch}
          placeholder="Search banks..."
          value={search}
        />
        <BankList
          banks={filtered}
          connectedIds={connectedIds}
          connecting={connecting}
          hasSearch={search.length > 0}
          isError={isBanksError}
          isPending={isBanksPending}
          onConnect={(bank) => {
            void connect(bank);
          }}
        />
      </div>
    </div>
  );
};

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
import { SearchInput } from "@/components/shared/search-input";
import type {
  BankConnectionReturnTo,
  BankInstitution,
} from "@/hooks/bank/use-bank-connections";
import { useBankConnections } from "@/hooks/bank/use-bank-connections";
import { buildBankRows } from "@/lib/bank/bank-rows";

interface BankConnectionPanelProps {
  banks: BankInstitution[];
  isBanksError: boolean;
  isBanksPending: boolean;
  /** Where the provider callback returns the user to. */
  returnTo: BankConnectionReturnTo;
}

/**
 * The one bank-linking surface, shared by onboarding and settings: every bank
 * the provider offers, the connected ones first and disconnectable in place.
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
    connecting,
    connections,
    disconnect,
    disconnectingId,
    isConnectionsMissing,
    isConnectionsPending,
  } = useBankConnections({ returnTo });

  const rows = useMemo(
    () => buildBankRows(banks, connections),
    [banks, connections]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return rows;
    }
    const q = search.toLowerCase();
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.institution?.bic?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Without the connections there is no telling which banks are already
  // connected, and offering one a second consent is worse than no list.
  if (isConnectionsMissing) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Could not load your banks</EmptyTitle>
          <EmptyDescription>Reload the page to try again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <SearchInput
        onChange={setSearch}
        placeholder="Search banks..."
        value={search}
      />
      <BankList
        connecting={connecting}
        disconnectingId={disconnectingId}
        hasSearch={search.length > 0}
        isError={isBanksError}
        isPending={isBanksPending || isConnectionsPending}
        onConnect={(row) => {
          if (row.institution) {
            void connect(row.institution);
          }
        }}
        onDisconnect={disconnect}
        rows={filtered}
      />
    </div>
  );
};

import { Button } from "@freenary/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@freenary/ui/components/item";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiBankLine } from "@remixicon/react";

import { DisconnectBankDialog } from "@/components/bank/disconnect-bank-dialog";
import { SyncButton } from "@/components/shared/sync-button";
import type { BankRow } from "@/lib/bank/bank-rows";
import { m } from "@/paraglide/messages.js";

interface BankCardProps {
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  row: BankRow;
  syncing: boolean;
}

export const BankCard = ({
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
  onSync,
  row,
  syncing,
}: BankCardProps) => (
  <Item
    render={<li />}
    className={row.connection ? "border-primary bg-secondary" : undefined}
    size="sm"
    variant="outline"
  >
    {/* Bank logos are full marks, not avatars — cropping them loses the name. */}
    <ItemMedia
      className="text-muted-foreground [&_img]:object-contain [&_svg]:size-5"
      variant="image"
    >
      {row.logo ? <img alt="" src={row.logo} /> : <RiBankLine />}
    </ItemMedia>
    <ItemContent className="min-w-0">
      <ItemTitle className="block w-full truncate">{row.name}</ItemTitle>
      {row.description ? (
        <ItemDescription>{row.description}</ItemDescription>
      ) : null}
    </ItemContent>
    <ItemActions>
      {row.connection ? (
        <>
          <SyncButton
            isSyncing={syncing}
            label={m.bank_row_sync({ institution: row.name })}
            onSync={onSync}
            size="icon-sm"
          />
          <DisconnectBankDialog
            accountCount={row.connection.accounts.length}
            institutionName={row.name}
            isDisconnecting={disconnecting}
            onConfirm={onDisconnect}
          />
        </>
      ) : (
        <Button
          disabled={connecting}
          onClick={onConnect}
          type="button"
          variant="secondary"
        >
          {connecting && <Spinner data-icon="inline-start" />}
          {m.bank_connect()}
        </Button>
      )}
    </ItemActions>
  </Item>
);

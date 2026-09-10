import type { Passkey } from "@better-auth/passkey/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@freenary/ui/components/alert-dialog";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@freenary/ui/components/item";
import { Spinner } from "@freenary/ui/components/spinner";
import { useState } from "react";

import { SecurityPasskeyNameDialog } from "@/components/settings/security-passkey-name-dialog";
import type { PasskeyRenameInput } from "@/hooks/settings/use-passkey-actions";
import { m } from "@/paraglide/messages.js";

type PasskeyReachSlug = "device_only" | "not_backed_up" | "synced";

interface SecurityPasskeyRowProps {
  formatter: Intl.DateTimeFormat;
  isRemoving: boolean;
  isRenaming: boolean;
  onRemove: (id: string) => void;
  onRename: (input: PasskeyRenameInput) => void;
  passkey: Passkey;
}

const REACH_LABELS = {
  device_only: m.settings_passkeys_reach_device_only,
  not_backed_up: m.settings_passkeys_reach_not_backed_up,
  synced: m.settings_passkeys_reach_synced,
} satisfies Record<PasskeyReachSlug, () => string>;

const signInReachOf = (passkey: Passkey): PasskeyReachSlug => {
  if (passkey.deviceType === "singleDevice") {
    return "device_only";
  }

  return passkey.backedUp ? "synced" : "not_backed_up";
};

export const SecurityPasskeyRow = ({
  formatter,
  isRemoving,
  isRenaming,
  onRemove,
  onRename,
  passkey,
}: SecurityPasskeyRowProps) => {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const storedName = passkey.name?.trim() ?? "";
  const displayName =
    storedName === "" ? m.settings_passkeys_unnamed() : storedName;
  const reach = REACH_LABELS[signInReachOf(passkey)]();

  return (
    <Item render={<li />} size="sm">
      <ItemContent className="min-w-0">
        <ItemTitle className="flex flex-wrap items-center gap-2">
          {displayName}
          <Badge>{reach}</Badge>
        </ItemTitle>
        <ItemDescription>
          {m.settings_passkeys_registered({
            date: formatter.format(passkey.createdAt),
          })}
        </ItemDescription>
      </ItemContent>

      <ItemActions>
        <Button
          aria-label={m.settings_passkeys_rename_passkey({
            passkey: displayName,
          })}
          disabled={isRenaming}
          onClick={() => setIsRenameOpen(true)}
          variant="tertiary"
        >
          {isRenaming && <Spinner data-icon="inline-start" />}
          {m.settings_passkeys_rename()}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                aria-label={m.settings_passkeys_remove_passkey({
                  passkey: displayName,
                })}
                disabled={isRemoving}
                variant="ghost"
              />
            }
          >
            {m.settings_passkeys_remove()}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {m.settings_passkeys_remove_title({ passkey: displayName })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.settings_passkeys_remove_description()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{m.settings_cancel()}</AlertDialogCancel>
              <AlertDialogAction
                disabled={isRemoving}
                onClick={() => onRemove(passkey.id)}
                variant="ghost"
                className="text-destructive hover:text-destructive"
              >
                {isRemoving && <Spinner data-icon="inline-start" />}
                {m.settings_passkeys_remove_confirm()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ItemActions>

      <SecurityPasskeyNameDialog
        confirmLabel={m.settings_passkeys_rename_confirm()}
        defaultName={storedName}
        description={m.settings_passkeys_rename_description()}
        onOpenChange={setIsRenameOpen}
        onSubmit={(next) => onRename({ id: passkey.id, name: next })}
        open={isRenameOpen}
        title={m.settings_passkeys_rename_title()}
      />
    </Item>
  );
};

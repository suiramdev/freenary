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

const REACH_LABELS = {
  device_only: m.settings_passkeys_reach_device_only,
  not_backed_up: m.settings_passkeys_reach_not_backed_up,
  synced: m.settings_passkeys_reach_synced,
} satisfies Record<PasskeyReachSlug, () => string>;

/**
 * Which devices this passkey can actually sign in from — the one thing a user
 * needs when deciding which of several to remove. `singleDevice` cannot leave
 * the authenticator it was made on; `multiDevice` can, but only once its
 * password manager has backed it up.
 */
const reachSlug = (passkey: Passkey): PasskeyReachSlug => {
  if (passkey.deviceType === "singleDevice") {
    return "device_only";
  }
  return passkey.backedUp ? "synced" : "not_backed_up";
};

interface SecurityPasskeyRowProps {
  /** One formatter for the whole list rather than one per row. */
  formatter: Intl.DateTimeFormat;
  isRemoving: boolean;
  isRenaming: boolean;
  onRemove: (id: string) => void;
  onRename: (input: PasskeyRenameInput) => void;
  passkey: Passkey;
}

export const SecurityPasskeyRow = ({
  formatter,
  isRemoving,
  isRenaming,
  onRemove,
  onRename,
  passkey,
}: SecurityPasskeyRowProps) => {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  // A passkey registered by another client may carry no name, or a blank one.
  const givenName = passkey.name?.trim() ?? "";
  const name = givenName === "" ? m.settings_passkeys_unnamed() : givenName;
  const reach = REACH_LABELS[reachSlug(passkey)]();

  return (
    <Item render={<li />} size="sm">
      <ItemContent className="min-w-0">
        <ItemTitle className="flex flex-wrap items-center gap-2">
          {name}
          <Badge variant="secondary">{reach}</Badge>
        </ItemTitle>
        <ItemDescription>
          {m.settings_passkeys_registered({
            date: formatter.format(passkey.createdAt),
          })}
        </ItemDescription>
      </ItemContent>

      <ItemActions>
        <Button
          aria-label={m.settings_passkeys_rename_passkey({ passkey: name })}
          disabled={isRenaming}
          onClick={() => setIsRenameOpen(true)}
          variant="outline"
        >
          {isRenaming && <Spinner data-icon="inline-start" />}
          {m.settings_passkeys_rename()}
        </Button>

        {/* Left open on confirm: success unmounts this row, and a failure keeps
            the retry available. */}
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                aria-label={m.settings_passkeys_remove_passkey({
                  passkey: name,
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
                {m.settings_passkeys_remove_title({ passkey: name })}
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
                variant="destructive"
              >
                {isRemoving && <Spinner data-icon="inline-start" />}
                {m.settings_passkeys_remove_confirm()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ItemActions>

      {/* Prefilled with the stored name, never the display fallback: offering
          the translated "unnamed" label would save it as the real name. */}
      <SecurityPasskeyNameDialog
        confirmLabel={m.settings_passkeys_rename_confirm()}
        defaultName={givenName}
        description={m.settings_passkeys_rename_description()}
        onOpenChange={setIsRenameOpen}
        onSubmit={(next) => onRename({ id: passkey.id, name: next })}
        open={isRenameOpen}
        title={m.settings_passkeys_rename_title()}
      />
    </Item>
  );
};

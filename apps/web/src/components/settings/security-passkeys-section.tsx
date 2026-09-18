import { Button } from "@freenary/ui/components/button";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { Spinner } from "@freenary/ui/components/spinner";
import { useMemo, useState } from "react";

import { SecurityPasskeyNameDialog } from "@/components/settings/security-passkey-name-dialog";
import { SecurityPasskeyRow } from "@/components/settings/security-passkey-row";
import { SecurityRowsSkeleton } from "@/components/settings/security-rows-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { usePasskeyActions } from "@/hooks/settings/use-passkey-actions";
import { useWebAuthnSupport } from "@/hooks/shared/use-webauthn-support";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

export const SecurityPasskeysSection = () => {
  const { data, error, isPending } = authClient.useListPasskeys();
  const { add, isAdding, remove, removingId, rename, renamingId } =
    usePasskeyActions();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const isWebAuthnSupported = useWebAuthnSupport();

  const locale = getLocale();
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale]
  );

  const isResolving = isPending || isWebAuthnSupported === null;

  const renderRows = () => {
    if (isResolving) {
      return (
        <SecurityRowsSkeleton loadingLabel={m.settings_passkeys_loading()} />
      );
    }

    if (error) {
      return (
        <p className="text-muted-foreground">
          {m.settings_passkeys_load_error()}
        </p>
      );
    }

    return (
      <>
        {isWebAuthnSupported === false && (
          <p className="text-muted-foreground">
            {m.settings_passkeys_unavailable()}
          </p>
        )}

        {data === null || data.length === 0 ? (
          <p className="text-muted-foreground">
            {m.settings_passkeys_empty_explanation()}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.map((passkey) => (
              <SecurityPasskeyRow
                formatter={formatter}
                isRemoving={removingId === passkey.id}
                isRenaming={renamingId === passkey.id}
                key={passkey.id}
                onRemove={remove}
                onRename={rename}
                passkey={passkey}
              />
            ))}
          </ul>
        )}
      </>
    );
  };

  const renderAction = () => {
    if (isResolving) {
      return <Skeleton aria-hidden="true" className="h-8 w-32 rounded-md" />;
    }

    if (isWebAuthnSupported === false) {
      return null;
    }

    return (
      <Button disabled={isAdding} onClick={() => setIsAddOpen(true)}>
        {isAdding && <Spinner data-icon="inline-start" />}
        {m.settings_passkeys_add()}
      </Button>
    );
  };

  return (
    <SettingsSection
      action={renderAction()}
      description={m.settings_passkeys_description()}
      title={m.settings_passkeys_title()}
    >
      {renderRows()}

      <SecurityPasskeyNameDialog
        confirmLabel={m.settings_passkeys_add_confirm()}
        defaultName={m.settings_passkeys_default_name()}
        description={m.settings_passkeys_add_description()}
        onOpenChange={setIsAddOpen}
        onSubmit={add}
        open={isAddOpen}
        title={m.settings_passkeys_add_title()}
      />
    </SettingsSection>
  );
};

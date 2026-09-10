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
import { useMemo } from "react";

import { SecurityRowsSkeleton } from "@/components/settings/security-rows-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { useLinkedAccountActions } from "@/hooks/settings/use-linked-account-actions";
import { CREDENTIAL_PROVIDER_ID } from "@/lib/settings/auth-queries";
import type { LinkedAccount } from "@/lib/settings/auth-queries";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

interface ProviderRow {
  isRetiredButStillLinked: boolean;
  label: string;
  linkedAccountId: string | null;
  providerId: string;
}

export interface OAuthProviderOption {
  id: string;
  name: string | null;
}

interface DisconnectProviderDialogProps {
  isDisconnecting: boolean;
  label: string;
  onConfirm: () => void;
}

interface SecurityAccountsSectionProps {
  accounts: LinkedAccount[] | undefined;
  isPending: boolean;
  providers: OAuthProviderOption[] | undefined;
}

const LABELS_FOR_PROVIDERS_THE_APP_NAMES_ITSELF = {
  apple: m.settings_accounts_provider_apple,
  google: m.settings_accounts_provider_google,
  oidc: m.settings_accounts_provider_sso,
} satisfies Record<string, () => string>;

const providerLabel = (providerId: string): string | null => {
  if (!Object.hasOwn(LABELS_FOR_PROVIDERS_THE_APP_NAMES_ITSELF, providerId)) {
    return null;
  }

  // SAFETY: hasOwn just proved providerId is one of this object's keys.
  return LABELS_FOR_PROVIDERS_THE_APP_NAMES_ITSELF[
    providerId as keyof typeof LABELS_FOR_PROVIDERS_THE_APP_NAMES_ITSELF
  ]();
};

const toLinkedRow = (account: LinkedAccount): ProviderRow => ({
  isRetiredButStillLinked: false,
  label: providerLabel(account.providerId) ?? account.providerId,
  linkedAccountId: account.id,
  providerId: account.providerId,
});

const buildProviderRows = (
  linkedOauth: LinkedAccount[],
  offeredProviders: OAuthProviderOption[] | undefined
): ProviderRow[] => {
  if (offeredProviders === undefined) {
    return linkedOauth.map(toLinkedRow);
  }

  const offered = offeredProviders.map((provider) => ({
    isRetiredButStillLinked: false,
    label: provider.name ?? providerLabel(provider.id) ?? provider.id,
    linkedAccountId:
      linkedOauth.find((account) => account.providerId === provider.id)?.id ??
      null,
    providerId: provider.id,
  }));

  const retiredButStillLinked = linkedOauth
    .filter(
      (account) =>
        !offeredProviders.some((provider) => provider.id === account.providerId)
    )
    .map((account) => ({
      ...toLinkedRow(account),
      isRetiredButStillLinked: true,
    }));

  return [...offered, ...retiredButStillLinked];
};

const DisconnectProviderDialog = ({
  isDisconnecting,
  label,
  onConfirm,
}: DisconnectProviderDialogProps) => (
  <AlertDialog>
    <AlertDialogTrigger
      render={
        <Button
          aria-label={m.settings_accounts_disconnect_provider({
            provider: label,
          })}
          variant="ghost"
        />
      }
    >
      {m.settings_accounts_disconnect()}
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {m.settings_accounts_disconnect_title({ provider: label })}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {m.settings_accounts_disconnect_description()}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{m.settings_cancel()}</AlertDialogCancel>
        <AlertDialogAction
          disabled={isDisconnecting}
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onConfirm}
        >
          {isDisconnecting && <Spinner data-icon="inline-start" />}
          {m.settings_accounts_disconnect_confirm()}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const SecurityAccountsSection = ({
  accounts,
  isPending,
  providers,
}: SecurityAccountsSectionProps) => {
  const { connect, connectingProvider, disconnect, disconnectingId } =
    useLinkedAccountActions();

  const locale = getLocale();
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale]
  );

  const passwordAccount = accounts?.find(
    (account) => account.providerId === CREDENTIAL_PROVIDER_ID
  );

  const rows = useMemo<ProviderRow[]>(() => {
    const linkedOauth = (accounts ?? []).filter(
      (account) => account.providerId !== CREDENTIAL_PROVIDER_ID
    );

    return buildProviderRows(linkedOauth, providers);
  }, [accounts, providers]);

  const renderRows = () => {
    if (isPending) {
      return (
        <SecurityRowsSkeleton loadingLabel={m.settings_accounts_loading()} />
      );
    }

    if (accounts === undefined) {
      return (
        <p className="text-muted-foreground">
          {m.settings_accounts_load_error()}
        </p>
      );
    }

    return (
      <>
        {passwordAccount === undefined && (
          <p className="text-muted-foreground">
            {m.settings_accounts_no_password_note()}
          </p>
        )}

        {providers === undefined && (
          <p className="text-muted-foreground">
            {m.settings_accounts_providers_load_error()}
          </p>
        )}

        {(passwordAccount !== undefined || rows.length > 0) && (
          <ul className="flex flex-col gap-1.5">
            {passwordAccount === undefined ? null : (
              <Item render={<li />} size="sm">
                <ItemContent className="min-w-0">
                  <ItemTitle>{m.settings_accounts_password()}</ItemTitle>
                  <ItemDescription>
                    {m.settings_accounts_added({
                      date: formatter.format(passwordAccount.createdAt),
                    })}
                  </ItemDescription>
                </ItemContent>
              </Item>
            )}

            {rows.map((row) => (
              <Item key={row.providerId} render={<li />} size="sm">
                <ItemContent className="min-w-0">
                  <ItemTitle className="flex flex-wrap items-center gap-2">
                    {row.label}
                    {row.linkedAccountId === null ? null : (
                      <Badge>{m.settings_accounts_connected()}</Badge>
                    )}
                  </ItemTitle>
                  {row.isRetiredButStillLinked && (
                    <ItemDescription>
                      {m.settings_accounts_provider_retired()}
                    </ItemDescription>
                  )}
                </ItemContent>

                <ItemActions>
                  {row.linkedAccountId === null ? (
                    <Button
                      aria-label={m.settings_accounts_connect_provider({
                        provider: row.label,
                      })}
                      disabled={connectingProvider === row.providerId}
                      onClick={() => connect(row.providerId)}
                      variant="tertiary"
                    >
                      {connectingProvider === row.providerId && (
                        <Spinner data-icon="inline-start" />
                      )}
                      {m.settings_accounts_connect()}
                    </Button>
                  ) : (
                    <DisconnectProviderDialog
                      isDisconnecting={disconnectingId === row.linkedAccountId}
                      label={row.label}
                      onConfirm={() => {
                        if (row.linkedAccountId !== null) {
                          disconnect(row.linkedAccountId);
                        }
                      }}
                    />
                  )}
                </ItemActions>
              </Item>
            ))}
          </ul>
        )}
      </>
    );
  };

  return (
    <SettingsSection
      description={m.settings_accounts_description()}
      title={m.settings_accounts_title()}
    >
      {renderRows()}
    </SettingsSection>
  );
};

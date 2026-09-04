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

/**
 * Labels for the providers the web app names itself. The generic OIDC provider
 * is absent on purpose: its label is operator-configured data, not copy.
 */
const PROVIDER_LABELS = {
  apple: m.settings_accounts_provider_apple,
  google: m.settings_accounts_provider_google,
  oidc: m.settings_accounts_provider_sso,
} satisfies Record<string, () => string>;

const providerLabel = (providerId: string): string | null => {
  if (!Object.hasOwn(PROVIDER_LABELS, providerId)) {
    return null;
  }
  // SAFETY: hasOwn just proved providerId is one of this object's keys.
  return PROVIDER_LABELS[providerId as keyof typeof PROVIDER_LABELS]();
};

interface ProviderRow {
  /** The linked account's id, or null when this provider is not linked. */
  accountId: string | null;
  /** True only where the provider list is known and no longer holds it. */
  isRetired: boolean;
  label: string;
  providerId: string;
}

export interface OAuthProviderOption {
  id: string;
  name: string | null;
}

interface SecurityAccountsSectionProps {
  /** Undefined once the list has failed rather than merely not arrived. */
  accounts: LinkedAccount[] | undefined;
  isPending: boolean;
  /** Undefined once the capabilities query has failed. The linked accounts are
   * still real, so they are rendered; only which providers are still offered
   * is unknowable, and the section says so rather than guessing. */
  providers: OAuthProviderOption[] | undefined;
}

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

    // Without the provider list there is nothing to offer a Connect button for
    // and no ground to call anything retired, so only the links themselves
    // remain.
    if (providers === undefined) {
      return linkedOauth.map((account) => ({
        accountId: account.id,
        isRetired: false,
        label: providerLabel(account.providerId) ?? account.providerId,
        providerId: account.providerId,
      }));
    }

    const configured = providers.map((provider) => ({
      accountId:
        linkedOauth.find((account) => account.providerId === provider.id)?.id ??
        null,
      isRetired: false,
      label: provider.name ?? providerLabel(provider.id) ?? provider.id,
      providerId: provider.id,
    }));

    // An identity stays visible after its provider's credentials are removed,
    // so an operator's change cannot orphan a way in the user cannot detach.
    const retired = linkedOauth
      .filter(
        (account) =>
          !providers.some((provider) => provider.id === account.providerId)
      )
      .map((account) => ({
        accountId: account.id,
        isRetired: true,
        label: providerLabel(account.providerId) ?? account.providerId,
        providerId: account.providerId,
      }));

    return [...configured, ...retired];
  }, [accounts, providers]);

  const renderRows = () => {
    if (isPending) {
      return <SecurityRowsSkeleton label={m.settings_accounts_loading()} />;
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
        {/* An account with no password has nothing to show in this list, and a
            passkey is not an account row either. */}
        {passwordAccount === undefined && (
          <p className="text-muted-foreground">
            {m.settings_accounts_no_password_note()}
          </p>
        )}

        {/* The rows below are real links; what is missing is which providers
            this instance still offers, so none can be connected from here. */}
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
                    {row.accountId === null ? null : (
                      <Badge variant="secondary">
                        {m.settings_accounts_connected()}
                      </Badge>
                    )}
                  </ItemTitle>
                  {row.isRetired && (
                    <ItemDescription>
                      {m.settings_accounts_provider_retired()}
                    </ItemDescription>
                  )}
                </ItemContent>

                <ItemActions>
                  {row.accountId === null ? (
                    <Button
                      aria-label={m.settings_accounts_connect_provider({
                        provider: row.label,
                      })}
                      disabled={connectingProvider === row.providerId}
                      onClick={() => connect(row.providerId)}
                      variant="outline"
                    >
                      {connectingProvider === row.providerId && (
                        <Spinner data-icon="inline-start" />
                      )}
                      {m.settings_accounts_connect()}
                    </Button>
                  ) : (
                    // Left open on confirm: success turns this row into a
                    // Connect button, and a failure keeps the retry available.
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            aria-label={m.settings_accounts_disconnect_provider(
                              { provider: row.label }
                            )}
                            variant="ghost"
                          />
                        }
                      >
                        {m.settings_accounts_disconnect()}
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {m.settings_accounts_disconnect_title({
                              provider: row.label,
                            })}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {m.settings_accounts_disconnect_description()}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {m.settings_cancel()}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={disconnectingId === row.accountId}
                            onClick={() => {
                              if (row.accountId !== null) {
                                disconnect(row.accountId);
                              }
                            }}
                            variant="destructive"
                          >
                            {disconnectingId === row.accountId && (
                              <Spinner data-icon="inline-start" />
                            )}
                            {m.settings_accounts_disconnect_confirm()}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

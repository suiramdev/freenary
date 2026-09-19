import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { RiErrorWarningLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { m } from "@/paraglide/messages.js";
import { orpc } from "@/shared/api";
import { useOauthCallbackError } from "@/shared/auth";
import { SECURITY_ANCHOR } from "@/shared/config";

import {
  authAccountsQueryOptions,
  authSessionsQueryOptions,
  CREDENTIAL_PROVIDER_ID,
} from "../api/auth-queries";
import type { LinkedAccount, UserSession } from "../api/auth-queries";
import { useScrollToAnchor } from "../lib/use-scroll-to-anchor";
import { useBudgetProfileEditor } from "../model/use-budget-profile-editor";
import type { ServerBudgetLine } from "../model/use-budget-profile-editor";
import { BankAccountsSection } from "./bank-accounts-section";
import { BudgetingSection } from "./budgeting-section";
import { CategoriesSection } from "./categories-section";
import { SecurityAccountsSection } from "./security-accounts-section";
import type { OAuthProviderOption } from "./security-accounts-section";
import { SecurityPasskeysSection } from "./security-passkeys-section";
import { SecuritySessionsSection } from "./security-sessions-section";
import { SecurityTwoFactorSection } from "./security-two-factor-section";
import { SettingsGroup } from "./settings-group";
import { UnsavedChangesBar } from "./unsaved-changes-bar";

interface SettingsContentProps {
  accounts: LinkedAccount[] | undefined;
  categories: CategoryEntry[];
  isAccountsPending: boolean;
  isCategoriesPending: boolean;
  isPending: boolean;
  isSessionsPending: boolean;
  providers: OAuthProviderOption[] | undefined;
  serverLines: ServerBudgetLine[] | undefined;
  sessions: UserSession[] | undefined;
}

const SettingsContent = ({
  accounts,
  categories,
  isAccountsPending,
  isCategoriesPending,
  isPending,
  isSessionsPending,
  providers,
  serverLines,
  sessions,
}: SettingsContentProps) => {
  const editor = useBudgetProfileEditor(serverLines, categories);
  const hasPassword: boolean | undefined = accounts?.some(
    (account) => account.providerId === CREDENTIAL_PROVIDER_ID
  );
  const securityRef = useScrollToAnchor<HTMLDivElement>(
    SECURITY_ANCHOR,
    !isAccountsPending
  );

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pb-20">
      <div id={SECURITY_ANCHOR} ref={securityRef}>
        <SettingsGroup
          description={m.settings_group_security_description()}
          title={m.settings_group_security_title()}
        >
          <SecurityTwoFactorSection
            hasPassword={hasPassword}
            isAccountsPending={isAccountsPending}
          />

          <SecurityPasskeysSection />

          <SecuritySessionsSection
            isPending={isSessionsPending}
            sessions={sessions}
          />

          <SecurityAccountsSection
            accounts={accounts}
            isPending={isAccountsPending}
            providers={providers}
          />
        </SettingsGroup>
      </div>

      <SettingsGroup
        description={m.settings_group_connections_description()}
        title={m.settings_group_connections_title()}
      >
        <BankAccountsSection />
      </SettingsGroup>

      <SettingsGroup
        description={m.settings_group_budgeting_description()}
        title={m.settings_group_budgeting_title()}
      >
        <BudgetingSection
          addLine={editor.addLine}
          categories={categories}
          errors={editor.errors}
          isPending={isPending}
          lines={editor.lines}
          moveLine={editor.moveLine}
          removeLine={editor.removeLine}
          reorderLines={editor.reorderLines}
          updateLine={editor.updateLine}
        />

        <CategoriesSection
          categories={categories}
          isPending={isCategoriesPending}
        />
      </SettingsGroup>

      <UnsavedChangesBar
        changeCount={editor.changeCount}
        hasErrors={editor.errors.size > 0}
        isSaving={editor.isSaving}
        onCancel={() => editor.reset()}
        onSave={() => editor.save()}
      />
    </div>
  );
};

export const SettingsPage = () => {
  const { error } = useSearch({ from: "/_auth/settings" });
  const navigate = useNavigate();

  useOauthCallbackError(error, () => {
    void navigate({ replace: true, search: {}, to: "/settings" });
  });

  const categoriesQuery = useQuery(orpc.settings.listCategories.queryOptions());
  const profileQuery = useQuery(orpc.settings.getBudgetProfile.queryOptions());
  const capabilitiesQuery = useQuery(orpc.auth.capabilities.queryOptions());
  const sessionsQuery = useQuery(authSessionsQueryOptions());
  const accountsQuery = useQuery(authAccountsQueryOptions());

  if (categoriesQuery.isError || profileQuery.isError) {
    const isRetrying = categoriesQuery.isFetching || profileQuery.isFetching;

    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiErrorWarningLine />
          </EmptyMedia>
          <EmptyTitle>{m.settings_load_error_title()}</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button
            loading={isRetrying}
            onClick={() => {
              void categoriesQuery.refetch();
              void profileQuery.refetch();
            }}
            variant="tertiary"
          >
            {m.settings_retry()}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <SettingsContent
      accounts={accountsQuery.data}
      categories={categoriesQuery.data?.categories ?? []}
      isAccountsPending={accountsQuery.isPending || capabilitiesQuery.isPending}
      isCategoriesPending={categoriesQuery.isPending}
      isPending={categoriesQuery.isPending || profileQuery.isPending}
      isSessionsPending={sessionsQuery.isPending}
      providers={capabilitiesQuery.data?.oauth}
      serverLines={profileQuery.data?.lines}
      sessions={sessionsQuery.data}
    />
  );
};

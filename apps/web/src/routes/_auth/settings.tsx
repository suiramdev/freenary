import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { Spinner } from "@freenary/ui/components/spinner";
import { RiErrorWarningLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { z } from "zod";

import { BankAccountsSection } from "@/components/settings/bank-accounts-section";
import { BudgetingSection } from "@/components/settings/budgeting-section";
import { CategoriesSection } from "@/components/settings/categories-section";
import { SecurityAccountsSection } from "@/components/settings/security-accounts-section";
import type { OAuthProviderOption } from "@/components/settings/security-accounts-section";
import { SecurityPasskeysSection } from "@/components/settings/security-passkeys-section";
import { SecuritySessionsSection } from "@/components/settings/security-sessions-section";
import { SecurityTwoFactorSection } from "@/components/settings/security-two-factor-section";
import { SettingsGroup } from "@/components/settings/settings-group";
import { UnsavedChangesBar } from "@/components/settings/unsaved-changes-bar";
import { useOauthCallbackError } from "@/hooks/auth/use-oauth-callback-error";
import { useBudgetProfileEditor } from "@/hooks/settings/use-budget-profile-editor";
import type { ServerBudgetLine } from "@/hooks/settings/use-budget-profile-editor";
import { useScrollToAnchor } from "@/hooks/shared/use-scroll-to-anchor";
import { SECURITY_ANCHOR } from "@/lib/settings/anchors";
import {
  authAccountsQueryOptions,
  authSessionsQueryOptions,
  CREDENTIAL_PROVIDER_ID,
} from "@/lib/settings/auth-queries";
import type { LinkedAccount, UserSession } from "@/lib/settings/auth-queries";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

interface SettingsContentProps {
  accounts: LinkedAccount[] | undefined;
  categories: CategoryEntry[];
  isAccountsPending: boolean;
  /** The categories list alone; the other sections also need the profile. */
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
  // The security group is the checklist's "protect your account" target.
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
            // Undefined when the account list has not answered or failed: a
            // section that reads "no password" from an outage tells every
            // password user something false and hides the only fix.
            hasPassword={accounts?.some(
              (account) => account.providerId === CREDENTIAL_PROVIDER_ID
            )}
            isAccountsPending={isAccountsPending}
          />

          {/* A passkey is a way in, so it sits with the other credential
              controls rather than after the session list. */}
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

// Connecting a provider that the server then refuses comes back here as
// `?error=<code>` rather than as a refused request, so the parameter is part of
// this route.
const settingsSearchSchema = z.object({ error: z.string().optional() });

const SettingsPage = () => {
  // Read by path rather than off `Route`, which is defined below this.
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
            disabled={isRetrying}
            onClick={() => {
              void categoriesQuery.refetch();
              void profileQuery.refetch();
            }}
            variant="outline"
          >
            {isRetrying && <Spinner data-icon="inline-start" />}
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
      // A skeleton only while an answer is still coming. A failed capabilities
      // query leaves `providers` undefined, which the section reports without
      // discarding the accounts it does have.
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

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
  validateSearch: settingsSearchSchema,
});

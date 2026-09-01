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
import { WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BankAccountsSection } from "@/components/settings/bank-accounts-section";
import { BudgetProfilePreview } from "@/components/settings/budget-profile-preview";
import { BudgetingSection } from "@/components/settings/budgeting-section";
import { CategoriesSection } from "@/components/settings/categories-section";
import { UnsavedChangesBar } from "@/components/settings/unsaved-changes-bar";
import { useBudgetProfileEditor } from "@/hooks/settings/use-budget-profile-editor";
import type { ServerBudgetLine } from "@/hooks/settings/use-budget-profile-editor";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/utils/orpc";

interface SettingsContentProps {
  categories: CategoryEntry[];
  /** The categories list alone; the other sections also need the profile. */
  isCategoriesPending: boolean;
  isPending: boolean;
  serverLines: ServerBudgetLine[] | undefined;
}

const SettingsContent = ({
  categories,
  isCategoriesPending,
  isPending,
  serverLines,
}: SettingsContentProps) => {
  const editor = useBudgetProfileEditor(serverLines, categories);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-20">
      <BankAccountsSection />

      <BudgetProfilePreview
        categories={categories}
        isPending={isPending}
        lines={editor.lines}
      />

      <BudgetingSection
        addLine={editor.addLine}
        categories={categories}
        errors={editor.errors}
        isPending={isPending}
        lines={editor.lines}
        removeLine={editor.removeLine}
        updateLine={editor.updateLine}
      />

      <CategoriesSection
        categories={categories}
        isPending={isCategoriesPending}
      />

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

const SettingsPage = () => {
  const categoriesQuery = useQuery(orpc.settings.listCategories.queryOptions());
  const profileQuery = useQuery(orpc.settings.getBudgetProfile.queryOptions());

  if (categoriesQuery.isError || profileQuery.isError) {
    const isRetrying = categoriesQuery.isFetching || profileQuery.isFetching;

    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
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
      categories={categoriesQuery.data?.categories ?? []}
      isCategoriesPending={categoriesQuery.isPending}
      isPending={categoriesQuery.isPending || profileQuery.isPending}
      serverLines={profileQuery.data?.lines}
    />
  );
};

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

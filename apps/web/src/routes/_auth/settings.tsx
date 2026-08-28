import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BudgetProfilePreview } from "@/components/settings/budget-profile-preview";
import { BudgetingSection } from "@/components/settings/budgeting-section";
import { CategoriesSection } from "@/components/settings/categories-section";
import { SettingsPageSkeleton } from "@/components/settings/settings-page-skeleton";
import { UnsavedChangesBar } from "@/components/settings/unsaved-changes-bar";
import { useBudgetProfileEditor } from "@/hooks/settings/use-budget-profile-editor";
import type { ServerBudgetLine } from "@/hooks/settings/use-budget-profile-editor";
import { orpc } from "@/utils/orpc";

interface SettingsContentProps {
  categories: CategoryEntry[];
  serverLines: ServerBudgetLine[];
}

const SettingsContent = ({ categories, serverLines }: SettingsContentProps) => {
  const editor = useBudgetProfileEditor(serverLines, categories);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-20">
      <BudgetProfilePreview categories={categories} lines={editor.lines} />

      <BudgetingSection
        addLine={editor.addLine}
        categories={categories}
        errors={editor.errors}
        lines={editor.lines}
        removeLine={editor.removeLine}
        updateLine={editor.updateLine}
      />

      <CategoriesSection categories={categories} />

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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <p className="text-muted-foreground text-sm">
          Could not load your settings.
        </p>
        <Button
          disabled={isRetrying}
          onClick={() => {
            void categoriesQuery.refetch();
            void profileQuery.refetch();
          }}
          size="sm"
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!(categoriesQuery.data && profileQuery.data)) {
    return <SettingsPageSkeleton />;
  }

  return (
    <SettingsContent
      categories={categoriesQuery.data.categories}
      serverLines={profileQuery.data.lines}
    />
  );
};

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

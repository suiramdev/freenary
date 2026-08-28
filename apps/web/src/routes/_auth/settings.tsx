import { Button } from "@freenary/ui/components/button";
import { Separator } from "@freenary/ui/components/separator";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BudgetingSection } from "@/components/settings/budgeting-section";
import { CategoriesSection } from "@/components/settings/categories-section";
import { SettingsPageSkeleton } from "@/components/settings/settings-page-skeleton";
import { orpc } from "@/utils/orpc";

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
    <div className="flex flex-1 flex-col gap-6 p-4">
      <BudgetingSection
        categories={categoriesQuery.data.categories}
        serverLines={profileQuery.data.lines}
      />

      <Separator />

      <CategoriesSection categories={categoriesQuery.data.categories} />
    </div>
  );
};

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

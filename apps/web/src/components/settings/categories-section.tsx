import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { CategoryRow } from "@/components/settings/category-row";
import { CustomCategoryDrawer } from "@/components/settings/custom-category-drawer";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCustomCategoryActions } from "@/hooks/settings/use-custom-category-actions";
import type { EditedCustomCategory } from "@/hooks/settings/use-custom-category-form";

/** `null` closes the drawer; `"new"` opens it empty; an entry opens it for editing. */
type DrawerState = EditedCustomCategory | "new" | null;

const editedOf = (entry: CategoryEntry): EditedCustomCategory => ({
  color: entry.color,
  icon: entry.icon,
  id: entry.key.split(":")[1] ?? "",
  label: entry.label,
  // SAFETY: parentKey on a custom entry is always a predefined SpendingCategory slug
  parentSlug: entry.parentKey as EditedCustomCategory["parentSlug"],
});

interface CategoriesSectionProps {
  categories: CategoryEntry[];
  isPending: boolean;
}

export const CategoriesSection = ({
  categories,
  isPending,
}: CategoriesSectionProps) => {
  const { deleteCategory, isDeleting, isMoving, moveCategory } =
    useCustomCategoryActions();
  const [drawer, setDrawer] = useState<DrawerState>(null);

  const labelByKey = new Map(
    categories.map((entry) => [entry.key, entry.label] as const)
  );

  return (
    <SettingsSection
      action={
        <Button
          disabled={isPending}
          onClick={() => setDrawer("new")}
          variant="outline"
        >
          <PlusIcon data-icon="inline-start" />
          New category
        </Button>
      }
      description="Built-in categories are fixed. Your own categories can be renamed, recolored, nested under a built-in one, reordered or removed."
      title="Categories"
    >
      {isPending ? (
        <div aria-busy="true">
          <output className="sr-only">Loading your categories</output>
          <Skeleton aria-hidden="true" className="h-[200px]" />
        </div>
      ) : (
        // Flush: each row's bottom border is the divider. A real list rather
        // than ItemGroup, whose `div[role=list]` cannot hold `<li>` rows.
        <ul className="flex flex-col">
          {categories.map((entry) => (
            <CategoryRow
              entry={entry}
              fallbackLabel={
                entry.parentKey
                  ? (labelByKey.get(entry.parentKey) ?? "Other")
                  : "Other"
              }
              isDeleting={isDeleting}
              isMoving={isMoving}
              key={entry.key}
              onDelete={deleteCategory}
              onEdit={(edited) => setDrawer(editedOf(edited))}
              onMove={moveCategory}
            />
          ))}
        </ul>
      )}

      <CustomCategoryDrawer
        edited={drawer === "new" ? null : drawer}
        onOpenChange={(open) => {
          if (!open) {
            setDrawer(null);
          }
        }}
        open={drawer !== null}
      />
    </SettingsSection>
  );
};

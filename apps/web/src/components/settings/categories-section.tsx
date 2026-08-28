import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { CategoryRow } from "@/components/settings/category-row";
import { CustomCategorySheet } from "@/components/settings/custom-category-sheet";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCustomCategoryActions } from "@/hooks/settings/use-custom-category-actions";
import type { EditedCustomCategory } from "@/hooks/settings/use-custom-category-form";

/** `null` closes the sheet; `"new"` opens it empty; an entry opens it for editing. */
type SheetState = EditedCustomCategory | "new" | null;

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
}

export const CategoriesSection = ({ categories }: CategoriesSectionProps) => {
  const { deleteCategory, isDeleting, isMoving, moveCategory } =
    useCustomCategoryActions();
  const [sheet, setSheet] = useState<SheetState>(null);

  const labelByKey = new Map(
    categories.map((entry) => [entry.key, entry.label] as const)
  );

  return (
    <SettingsSection
      action={
        <Button onClick={() => setSheet("new")} size="sm" variant="outline">
          <PlusIcon data-icon="inline-start" />
          New category
        </Button>
      }
      description="Built-in categories are fixed. Your own categories can be renamed, recolored, nested under a built-in one, reordered or removed."
      title="Categories"
    >
      <div className="flex flex-col">
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
            onEdit={(edited) => setSheet(editedOf(edited))}
            onMove={moveCategory}
          />
        ))}
      </div>

      <CustomCategorySheet
        edited={sheet === "new" ? null : sheet}
        key={sheet === "new" || sheet === null ? "new" : sheet.id}
        onOpenChange={(open) => {
          if (!open) {
            setSheet(null);
          }
        }}
        open={sheet !== null}
      />
    </SettingsSection>
  );
};

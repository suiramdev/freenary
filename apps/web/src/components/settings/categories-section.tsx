import type { CategoryEntry } from "@freenary/api/lib/categories";
import {
  CATEGORY_GROUP_FALLBACKS,
  CATEGORY_LABELS,
  isCategoryGroup,
} from "@freenary/api/lib/taxonomy";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { PlusIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
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
  // SAFETY: parentKey on a custom entry is always a CategoryGroup slug
  parentSlug: entry.parentKey as EditedCustomCategory["parentSlug"],
});

interface CategoryTreeGroup {
  children: CategoryEntry[];
  group: CategoryEntry;
}

/**
 * Deleting a custom category moves its lines to its group's catch-all, so the
 * confirmation must name that category — never the group, which cannot hold one.
 */
const fallbackLabelOf = (groupKey: string) =>
  isCategoryGroup(groupKey)
    ? CATEGORY_LABELS[CATEGORY_GROUP_FALLBACKS[groupKey]]
    : CATEGORY_LABELS.uncategorised;

/** Rebuilds the group → categories tree from the flat, ordered server list. */
const toTree = (categories: CategoryEntry[]): CategoryTreeGroup[] => {
  const tree: CategoryTreeGroup[] = [];
  for (const entry of categories) {
    if (entry.isGroup) {
      tree.push({ children: [], group: entry });
    } else {
      tree.at(-1)?.children.push(entry);
    }
  }
  return tree;
};

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
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const tree = useMemo(() => toTree(categories), [categories]);

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
      description="Categories are grouped, and the groups are fixed. Your own categories can be renamed, recolored, nested under a group, reordered or removed."
      title="Categories"
    >
      {isPending ? (
        <div aria-busy="true">
          <output className="sr-only">Loading your categories</output>
          <Skeleton aria-hidden="true" className="h-[200px]" />
        </div>
      ) : (
        // Ninety-odd categories do not read as a flat list, so each group opens
        // on demand and stays shut until asked for.
        <div className="flex flex-col">
          {tree.map(({ children, group }) =>
            // A custom top-level category is a group of the user's own with no
            // categories under it, so it stays an ordinary editable row.
            group.isCustom ? (
              <ul className="flex flex-col" key={group.key}>
                <CategoryRow
                  entry={group}
                  fallbackLabel={CATEGORY_LABELS.uncategorised}
                  isDeleting={isDeleting}
                  isMoving={isMoving}
                  onDelete={deleteCategory}
                  onEdit={(edited) => setDrawer(editedOf(edited))}
                  onMove={moveCategory}
                />
              </ul>
            ) : (
              <Collapsible
                key={group.key}
                open={openGroups.includes(group.key)}
                onOpenChange={(open) =>
                  setOpenGroups((current) =>
                    open
                      ? [...current, group.key]
                      : current.filter((key) => key !== group.key)
                  )
                }
              >
                <CollapsibleTrigger className="border-b-border border-b px-2 py-2">
                  <CategoryIcon
                    className="size-8 [&_svg]:size-4"
                    color={group.color}
                    icon={group.icon}
                  />
                  <span className="flex-1 truncate text-sm font-medium">
                    {group.label}
                  </span>
                  <Badge variant="secondary">{children.length}</Badge>
                </CollapsibleTrigger>
                <CollapsiblePanel>
                  <ul className="flex flex-col">
                    {children.map((entry) => (
                      <CategoryRow
                        entry={entry}
                        fallbackLabel={fallbackLabelOf(group.key)}
                        isDeleting={isDeleting}
                        isMoving={isMoving}
                        key={entry.key}
                        onDelete={deleteCategory}
                        onEdit={(edited) => setDrawer(editedOf(edited))}
                        onMove={moveCategory}
                      />
                    ))}
                  </ul>
                </CollapsiblePanel>
              </Collapsible>
            )
          )}
        </div>
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

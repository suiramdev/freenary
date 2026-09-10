import type { CategoryEntry } from "@freenary/api/lib/categories";
import {
  CATEGORY_GROUP_FALLBACKS,
  isCategoryGroup,
} from "@freenary/api/lib/taxonomy";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@freenary/ui/components/collapsible";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { RiAddLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { CategoryRow } from "@/components/settings/category-row";
import { CustomCategoryDrawer } from "@/components/settings/custom-category-drawer";
import { SettingsSection } from "@/components/settings/settings-section";
import { useCustomCategoryActions } from "@/hooks/settings/use-custom-category-actions";
import type { EditedCustomCategory } from "@/hooks/settings/use-custom-category-form";
import { categoryEntryLabel, categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

type DrawerState = EditedCustomCategory | "new" | null;

interface CategoryTreeGroup {
  children: CategoryEntry[];
  group: CategoryEntry;
}

interface CategoriesSectionProps {
  categories: CategoryEntry[];
  isPending: boolean;
}

const editedOf = (entry: CategoryEntry): EditedCustomCategory => ({
  color: entry.color,
  icon: entry.icon,
  id: entry.key.split(":")[1] ?? "",
  label: entry.label,
  // SAFETY: parentKey on a custom entry is always a CategoryGroup slug
  parentSlug: entry.parentKey as EditedCustomCategory["parentSlug"],
});

const catchAllCategoryLabelOf = (groupKey: string) =>
  isCategoryGroup(groupKey)
    ? categoryLabel(CATEGORY_GROUP_FALLBACKS[groupKey])
    : categoryLabel("uncategorised");

const toGroupTreeInServerOrder = (
  categories: CategoryEntry[]
): CategoryTreeGroup[] => {
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

export const CategoriesSection = ({
  categories,
  isPending,
}: CategoriesSectionProps) => {
  const { deleteCategory, isDeleting, isMoving, moveCategory } =
    useCustomCategoryActions();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const tree = useMemo(
    () => toGroupTreeInServerOrder(categories),
    [categories]
  );

  return (
    <SettingsSection
      action={
        <Button
          disabled={isPending}
          onClick={() => setDrawer("new")}
          variant="tertiary"
        >
          <RiAddLine data-icon="inline-start" />
          {m.settings_category_new()}
        </Button>
      }
      description={m.settings_categories_description()}
      title={m.settings_categories_title()}
    >
      {isPending ? (
        <div aria-busy="true">
          <output className="sr-only">{m.settings_categories_loading()}</output>
          <Skeleton aria-hidden="true" className="h-[200px]" />
        </div>
      ) : (
        <div className="flex flex-col">
          {tree.map(({ children, group }) => {
            const isUsersOwnTopLevelCategory = group.isCustom;

            return isUsersOwnTopLevelCategory ? (
              <ul className="flex flex-col" key={group.key}>
                <CategoryRow
                  entry={group}
                  fallbackLabel={categoryLabel("uncategorised")}
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
                <CollapsibleTrigger
                  chevron="leading"
                  className="border-b-border border-b px-2 py-2"
                >
                  <CategoryIcon
                    className="size-8 [&_svg]:size-4"
                    color={group.color}
                    icon={group.icon}
                  />
                  <span className="flex-1 truncate text-sm font-medium">
                    {categoryEntryLabel(group)}
                  </span>
                  <Badge>{children.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="flex flex-col">
                    {children.map((entry) => (
                      <CategoryRow
                        entry={entry}
                        fallbackLabel={catchAllCategoryLabelOf(group.key)}
                        isDeleting={isDeleting}
                        isMoving={isMoving}
                        key={entry.key}
                        onDelete={deleteCategory}
                        onEdit={(edited) => setDrawer(editedOf(edited))}
                        onMove={moveCategory}
                      />
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
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

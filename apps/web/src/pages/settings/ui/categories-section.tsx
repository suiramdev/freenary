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
import { FluidHoverHighlight } from "@freenary/ui/components/fluid-hover-highlight";
import { Skeleton } from "@freenary/ui/components/skeleton";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@freenary/ui/hooks/use-fluid-hover";
import { useIcon } from "@freenary/ui/lib/icon-context";
import { SizeProvider, useSize } from "@freenary/ui/lib/size-context";
import type { SizeVariant } from "@freenary/ui/lib/size-context";
import { cn } from "@freenary/ui/lib/utils";
import { useMemo, useRef, useState } from "react";
import type { TransitionEvent } from "react";

import {
  categoryEntryLabel,
  CategoryIcon,
  categoryLabel,
} from "@/entities/category";
import { m } from "@/paraglide/messages.js";

import { useCustomCategoryActions } from "../model/use-custom-category-actions";
import type { EditedCustomCategory } from "../model/use-custom-category-form";
import { CATEGORY_CHIP_BOX, CategoryRow } from "./category-row";
import { CustomCategoryDrawer } from "./custom-category-drawer";
import { SETTINGS_BLEED, SettingsSection } from "./settings-section";

type DrawerState = EditedCustomCategory | "new" | null;

interface CategoryTreeGroup {
  children: CategoryEntry[];
  group: CategoryEntry;
}

interface CategoriesSectionProps {
  categories: CategoryEntry[];
  isPending: boolean;
}

interface CategoryGroupHeaderProps {
  count: number;
  group: CategoryEntry;
  index: number;
  registerItem: (index: number, element: HTMLElement | null) => void;
}

const SKELETON_GROUPS = 3;

const LIST_SIZE: SizeVariant = "default";

const CHILDREN_GUIDE_UNDER_THE_GROUP_ICON = "border-border ml-[45px] border-l";

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

const CategoryGroupHeader = ({
  count,
  group,
  index,
  registerItem,
}: CategoryGroupHeaderProps) => {
  const headerRef = useRef<HTMLButtonElement>(null);
  const { control, text, variant } = useSize();

  useRegisterFluidHoverItem(registerItem, index, headerRef);

  return (
    <CollapsibleTrigger
      chevron="leading"
      className={cn(
        "relative z-10 px-3 shadow-[inset_0_-1px_0_var(--color-border)]",
        control
      )}
      ref={headerRef}
    >
      <CategoryIcon
        className={CATEGORY_CHIP_BOX[variant]}
        color={group.color}
        icon={group.icon}
      />
      <span className={cn("flex-1 truncate font-medium", text)}>
        {categoryEntryLabel(group)}
      </span>
      <Badge>{count}</Badge>
    </CollapsibleTrigger>
  );
};

export const CategoriesSection = ({
  categories,
  isPending,
}: CategoriesSectionProps) => {
  const { deleteCategory, isDeleting, isMoving, moveCategory } =
    useCustomCategoryActions();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const PlusIcon = useIcon("plus");
  const { control } = useSize(LIST_SIZE);
  const hover = useFluidHover(listRef, { axis: "y", gapClick: false });

  const remeasureAfterTheHeightSettles = (
    event: TransitionEvent<HTMLElement>
  ) => {
    if (
      event.target === event.currentTarget &&
      event.propertyName === "height"
    ) {
      hover.remeasure();
    }
  };

  const tree = useMemo(
    () => toGroupTreeInServerOrder(categories),
    [categories]
  );

  const { hoverIndices, rowsThatLightUp } = useMemo(() => {
    const indices = new Map<string, number>();
    const lit = new Set<number>();
    let next = 0;

    for (const { children, group } of tree) {
      indices.set(group.key, next);
      lit.add(next);
      next += 1;

      for (const child of children) {
        indices.set(child.key, next);

        if (child.isCustom) {
          lit.add(next);
        }

        next += 1;
      }
    }

    return { hoverIndices: indices, rowsThatLightUp: lit };
  }, [tree]);

  return (
    <SettingsSection
      action={
        <Button
          disabled={isPending}
          leadingIcon={PlusIcon}
          onClick={() => setDrawer("new")}
          variant="tertiary"
        >
          {m.settings_category_new()}
        </Button>
      }
      description={m.settings_categories_description()}
      title={m.settings_categories_title()}
    >
      {isPending ? (
        <div aria-busy="true">
          <output className="sr-only">{m.settings_categories_loading()}</output>
          <div
            aria-hidden="true"
            className={cn("flex flex-col", SETTINGS_BLEED)}
          >
            {Array.from({ length: SKELETON_GROUPS }, (_, i) => (
              <div className={cn("flex items-center px-3", control)} key={i}>
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <SizeProvider size={LIST_SIZE}>
          <div
            className={cn("relative flex flex-col", SETTINGS_BLEED)}
            ref={listRef}
            {...hover.handlers}
          >
            <FluidHoverHighlight
              className="rounded-none"
              hidden={
                hover.activeIndex === null ||
                !rowsThatLightUp.has(hover.activeIndex)
              }
              hover={hover}
            />
            <ul className="flex flex-col">
              {tree.map(({ children, group }) => {
                const isUsersOwnTopLevelCategory = group.isCustom;

                return isUsersOwnTopLevelCategory ? (
                  <CategoryRow
                    entry={group}
                    fallbackLabel={categoryLabel("uncategorised")}
                    index={hoverIndices.get(group.key) ?? 0}
                    isDeleting={isDeleting}
                    isMoving={isMoving}
                    key={group.key}
                    onDelete={deleteCategory}
                    onEdit={(edited) => setDrawer(editedOf(edited))}
                    onMove={moveCategory}
                    registerItem={hover.registerItem}
                  />
                ) : (
                  <Collapsible
                    key={group.key}
                    onOpenChange={(open) =>
                      setOpenGroups((current) =>
                        open
                          ? [...current, group.key]
                          : current.filter((key) => key !== group.key)
                      )
                    }
                    open={openGroups.includes(group.key)}
                    render={<li />}
                  >
                    <CategoryGroupHeader
                      count={children.length}
                      group={group}
                      index={hoverIndices.get(group.key) ?? 0}
                      registerItem={hover.registerItem}
                    />
                    <CollapsibleContent
                      onTransitionEnd={remeasureAfterTheHeightSettles}
                    >
                      <ul
                        className={cn(
                          "flex flex-col",
                          CHILDREN_GUIDE_UNDER_THE_GROUP_ICON
                        )}
                      >
                        {children.map((entry) => (
                          <CategoryRow
                            entry={entry}
                            fallbackLabel={catchAllCategoryLabelOf(group.key)}
                            index={hoverIndices.get(entry.key) ?? 0}
                            isDeleting={isDeleting}
                            isMoving={isMoving}
                            key={entry.key}
                            onDelete={deleteCategory}
                            onEdit={(edited) => setDrawer(editedOf(edited))}
                            onMove={moveCategory}
                            registerItem={hover.registerItem}
                          />
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </ul>
          </div>
        </SizeProvider>
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

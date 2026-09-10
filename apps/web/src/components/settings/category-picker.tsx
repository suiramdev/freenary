import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownContent,
  DropdownEmpty,
  DropdownLabel,
  DropdownMenu,
  DropdownSearch,
  DropdownSeparator,
  DropdownTrigger,
} from "@freenary/ui/components/dropdown";
import { MenuItem } from "@freenary/ui/components/menu-item";
import { cn } from "@freenary/ui/lib/utils";
import { RiAddLine, RiExpandUpDownLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { categoryMenuIcon } from "@/components/budget/category-menu-icon";
import { remixIcon } from "@/lib/remix-icon";
import { toCategorySections } from "@/lib/settings/category-sections";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

interface CategoryPickerProps {
  categories: CategoryEntry[];
  /** Opens the custom-category sheet for the "none of these fit" case. */
  onCreateRequest: () => void;
  onSelect: (key: string) => void;
  value: string;
}

/**
 * A menu rather than a select: the list mixes the category values with a
 * "create one" command, which a `Select` cannot carry.
 */
export const CategoryPicker = ({
  categories,
  onCreateRequest,
  onSelect,
  value,
}: CategoryPickerProps) => {
  const [query, setQuery] = useState("");
  const selected = categories.find((entry) => entry.key === value);

  // Ninety-odd entries are too many to scan, so typing narrows them.
  const sections = useMemo(
    () => toCategorySections(categories, query),
    [categories, query]
  );

  // Fluid Functionalism menu rows register by flat index across the popup;
  // each section carries the offset its rows start at, and the trailing
  // "create one" row sits after every category row.
  const grouped = useMemo(() => {
    const out: { offset: number; section: (typeof sections)[number] }[] = [];
    let offset = 0;
    for (const section of sections) {
      out.push({ offset, section });
      offset += section.items.length;
    }
    return out;
  }, [sections]);
  const flatEntries = sections.flatMap((section) => section.items);
  const checkedIndex = flatEntries.findIndex((entry) => entry.key === value);
  const createIndex = flatEntries.length;

  return (
    <DropdownMenu onOpenChange={() => setQuery("")}>
      <DropdownTrigger
        render={
          <Button
            className="w-40 shrink-0 justify-between"
            trailingIcon={remixIcon(RiExpandUpDownLine)}
            variant="tertiary"
          />
        }
      >
        <span className="truncate">
          {selected
            ? categoryEntryLabel(selected)
            : m.settings_category_picker_placeholder()}
        </span>
      </DropdownTrigger>
      <DropdownContent
        align="start"
        checkedIndex={checkedIndex === -1 ? undefined : checkedIndex}
        className="max-h-72 w-64 overflow-y-auto"
      >
        <DropdownSearch
          onValueChange={setQuery}
          placeholder={m.settings_category_search_placeholder()}
          value={query}
        />
        {grouped.map(({ offset, section }) => (
          <div key={section.key}>
            {/* A group is a heading; a line is assigned a category. Each
                heading labels its own section, not the whole list. */}
            {section.heading && (
              <DropdownLabel>
                {categoryEntryLabel(section.heading)}
              </DropdownLabel>
            )}
            {section.items.map((entry, position) => (
              <MenuItem
                checked={entry.key === value}
                className={cn(section.heading && "ps-8")}
                icon={categoryMenuIcon(entry)}
                index={offset + position}
                key={entry.key}
                label={categoryEntryLabel(entry)}
                onSelect={() => onSelect(entry.key)}
              />
            ))}
          </div>
        ))}
        {sections.length === 0 && (
          <DropdownEmpty>{m.settings_category_search_empty()}</DropdownEmpty>
        )}
        <DropdownSeparator />
        <MenuItem
          icon={remixIcon(RiAddLine)}
          index={createIndex}
          label={m.settings_category_new_ellipsis()}
          onSelect={onCreateRequest}
        />
      </DropdownContent>
    </DropdownMenu>
  );
};

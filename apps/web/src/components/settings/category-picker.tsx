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
  onCreateRequest: () => void;
  onSelect: (key: string) => void;
  value: string;
}

export const CategoryPicker = ({
  categories,
  onCreateRequest,
  onSelect,
  value,
}: CategoryPickerProps) => {
  const [query, setQuery] = useState("");
  const selected = categories.find((entry) => entry.key === value);

  const sections = useMemo(
    () => toCategorySections(categories, query),
    [categories, query]
  );

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

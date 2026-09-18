import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSearch,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { cn } from "@freenary/ui/lib/utils";
import { RiAddLine, RiExpandUpDownLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
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

  return (
    <DropdownMenu onOpenChange={() => setQuery("")}>
      <DropdownMenuTrigger
        render={
          <Button className="w-40 shrink-0 justify-between" variant="outline" />
        }
      >
        <span className="truncate">
          {selected
            ? categoryEntryLabel(selected)
            : m.settings_category_picker_placeholder()}
        </span>
        <RiExpandUpDownLine data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 w-64 overflow-y-auto"
      >
        <DropdownMenuSearch
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.settings_category_search_placeholder()}
          value={query}
        />
        <DropdownMenuRadioGroup value={value} onValueChange={onSelect}>
          {sections.map((section) => (
            <DropdownMenuGroup key={section.key}>
              {section.heading && (
                <DropdownMenuLabel>
                  {categoryEntryLabel(section.heading)}
                </DropdownMenuLabel>
              )}
              {section.items.map((entry) => (
                <DropdownMenuRadioItem
                  key={entry.key}
                  value={entry.key}
                  closeOnClick={true}
                  className={cn(section.heading && "ps-8")}
                >
                  <CategoryIcon
                    color={entry.color}
                    icon={entry.icon}
                    className="size-5 [&_svg]:size-3"
                  />
                  {categoryEntryLabel(entry)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
        {sections.length === 0 && (
          <DropdownMenuEmpty>
            {m.settings_category_search_empty()}
          </DropdownMenuEmpty>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onCreateRequest}>
            <RiAddLine data-icon="inline-start" />
            {m.settings_category_new_ellipsis()}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

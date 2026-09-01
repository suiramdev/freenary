import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import { cn } from "@freenary/ui/lib/utils";
import {
  CaretUpDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { toCategorySections } from "@/lib/settings/category-sections";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

/** Keys the search field must keep; everything else belongs to the menu. */
const EDITING_KEYS = new Set(["Backspace", "Delete", "End", "Home"]);

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
        <CaretUpDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 w-64 overflow-y-auto"
      >
        <div className="p-1">
          <InputGroup>
            <InputGroupAddon>
              <MagnifyingGlassIcon />
            </InputGroupAddon>
            <InputGroupInput
              onChange={(e) => setQuery(e.target.value)}
              // The menu's typeahead preventDefaults every printable key and
              // its list navigation does the same for Home/End, which would
              // swallow the keystroke before the field sees it. Arrows, Enter,
              // Tab and Escape still reach the menu.
              onKeyDown={(event) => {
                if (event.key.length === 1 || EDITING_KEYS.has(event.key)) {
                  event.stopPropagation();
                }
              }}
              placeholder={m.settings_category_search_placeholder()}
              type="search"
              value={query}
            />
          </InputGroup>
        </div>
        <DropdownMenuRadioGroup value={value} onValueChange={onSelect}>
          {sections.map((section) => (
            <DropdownMenuGroup key={section.key}>
              {/* A group is a heading; a line is assigned a category. Each
                  heading labels its own section, not the whole radio group. */}
              {section.heading && (
                <DropdownMenuLabel>
                  {categoryEntryLabel(section.heading)}
                </DropdownMenuLabel>
              )}
              {section.items.map((entry) => (
                <DropdownMenuRadioItem
                  key={entry.key}
                  value={entry.key}
                  className={cn(section.heading && "pl-8")}
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
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onCreateRequest}>
            <PlusIcon data-icon="inline-start" />
            {m.settings_category_new_ellipsis()}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

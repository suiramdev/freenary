import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { cn } from "@freenary/ui/lib/utils";
import { CaretUpDownIcon, PlusIcon } from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/budget/category-icon";

interface CategoryPickerProps {
  categories: CategoryEntry[];
  /** Opens the custom-category sheet for the "none of these fit" case. */
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
  const selected = categories.find((entry) => entry.key === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-40 shrink-0 justify-between gap-1.5 font-normal"
          />
        }
      >
        <span className="truncate">{selected?.label ?? "Pick a category"}</span>
        <CaretUpDownIcon className="text-muted-foreground size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onSelect}>
          {categories.map((entry) => (
            <DropdownMenuRadioItem
              key={entry.key}
              value={entry.key}
              className={cn(entry.parentKey && "pl-8")}
            >
              <CategoryIcon
                color={entry.color}
                icon={entry.icon}
                className="size-5 [&_svg]:size-3"
              />
              {entry.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateRequest}>
          <PlusIcon data-icon="inline-start" />
          New category…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

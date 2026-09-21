import type { CategoryAppearance } from "@freenary/api/lib/categories";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@freenary/ui/components/select";

import { categoryMenuIcon } from "@/entities/category";
import { m } from "@/paraglide/messages.js";

export interface CategoryParentOption {
  appearance: CategoryAppearance;
  key: string;
  label: string;
}

interface CategoryParentSelectProps {
  id?: string;
  noneLabel?: string;
  onValueChange: (value: string | null) => void;
  options: CategoryParentOption[];
  value: string | null;
}

const NONE_VALUE = "none";

const NONE_INDEX = 0;

const FIRST_OPTION_INDEX = NONE_INDEX + 1;

export const CategoryParentSelect = ({
  id,
  noneLabel = m.settings_category_parent_none(),
  onValueChange,
  options,
  value,
}: CategoryParentSelectProps) => {
  const selected = options.find((option) => option.key === value);

  return (
    <Select
      onValueChange={(next: string) => {
        onValueChange(next === NONE_VALUE ? null : next);
      }}
      value={value ?? NONE_VALUE}
    >
      <SelectTrigger
        icon={selected ? categoryMenuIcon(selected.appearance) : undefined}
        id={id}
        placeholder={noneLabel}
      />
      <SelectContent className="min-w-56">
        <SelectGroup>
          <SelectItem index={NONE_INDEX} value={NONE_VALUE}>
            {noneLabel}
          </SelectItem>
          {options.map((option, position) => (
            <SelectItem
              icon={categoryMenuIcon(option.appearance)}
              index={FIRST_OPTION_INDEX + position}
              key={option.key}
              value={option.key}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

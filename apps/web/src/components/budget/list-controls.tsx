import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@freenary/ui/components/toggle-group";
import { cn } from "@freenary/ui/lib/utils";
import { RiCloseLine, RiSearchLine } from "@remixicon/react";
import type { ReactNode } from "react";

import { m } from "@/paraglide/messages.js";

/**
 * The controls every budget list shares, so Transactions and Recurring read as
 * one screen with two subjects: the same search box, the same ordering toggle,
 * the same removable chips under the same filter row.
 */

/** Toggle's sm size sits below the outline trigger beside it, and Toggle
    carries no press feedback of its own. */
const SORT_ITEM_CLASS =
  "h-7 text-xs/relaxed transition-transform duration-150 ease-out active:scale-[0.96]";

/** One row, wrapping: a filter that does not fit drops to the next line. */
export const ListFilterBar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">{children}</div>
);

export const ListSearchInput = ({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) => (
  <InputGroup className="min-w-40 flex-1">
    <InputGroupAddon>
      <RiSearchLine />
    </InputGroupAddon>
    <InputGroupInput
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  </InputGroup>
);

/** The ordering of a list, as two or three words rather than a menu. */
export const ListSortToggle = <T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
}) => (
  <ToggleGroup
    aria-label={label}
    onValueChange={([next]) => {
      const chosen = options.find((option) => option.value === next);
      if (chosen) {
        onChange(chosen.value);
      }
    }}
    size="sm"
    spacing={0}
    value={[value]}
    variant="outline"
  >
    {options.map((option) => (
      <ToggleGroupItem
        className={SORT_ITEM_CLASS}
        key={option.value}
        value={option.value}
      >
        {option.label}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

/** The chips sit tighter than the controls that produced them. */
export const ListFilterChips = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-1.5">{children}</div>
);

/**
 * One active filter, and the control that drops it. The whole chip is the
 * button: a close icon small enough to aim at would be a worse target than the
 * label beside it. `truncate` is for bank text, which has no length a layout
 * can count on.
 */
export const ListFilterChip = ({
  icon,
  label,
  onRemove,
  truncate = false,
}: {
  icon?: ReactNode;
  label: string;
  onRemove: () => void;
  truncate?: boolean;
}) => (
  <Badge
    className={cn("hover:bg-muted", truncate && "max-w-48")}
    render={
      <button
        aria-label={m.budget_filter_remove({ label })}
        onClick={onRemove}
        type="button"
      />
    }
    variant="outline"
  >
    {icon}
    {truncate ? <span className="min-w-0 truncate">{label}</span> : label}
    <RiCloseLine data-icon="inline-end" />
  </Badge>
);

/** Worth offering once two filters are on; one chip is its own clear button. */
export const ClearFiltersButton = ({ onClear }: { onClear: () => void }) => (
  <Button onClick={onClear} variant="ghost">
    {m.budget_filter_clear_all()}
  </Button>
);

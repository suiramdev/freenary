import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import { Field, FieldLabel } from "@freenary/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from "@freenary/ui/components/popover";
import { RiCoinsLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { currencySymbol } from "@/lib/budget/format-currency";
import {
  EMPTY_AMOUNT_RANGE,
  parseAmountBound,
} from "@/lib/budget/transaction-filters";
import type { AmountRange } from "@/lib/budget/transaction-filters";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/** Long enough that typing 1, 12, 125 costs one request rather than three. */
const AMOUNT_SETTLE_MS = 400;

/** A bound of zero is no bound, and no bound is an empty box. */
const draftOf = (range: AmountRange) => ({
  max: range.max > 0 ? String(range.max) : "",
  min: range.min > 0 ? String(range.min) : "",
});

interface AmountFilterMenuProps {
  onRangeChange: (range: AmountRange) => void;
  range: AmountRange;
}

/** The transaction list's amount filter: how much moved, in either direction. */
export const AmountFilterMenu = ({
  onRangeChange,
  range,
}: AmountFilterMenuProps) => {
  const locale = getLocale();
  const [draft, setDraft] = useState(() => draftOf(range));
  const settled = useDebouncedValue(draft, AMOUNT_SETTLE_MS);
  const applied = useRef(range);

  useEffect(() => {
    const next = {
      max: parseAmountBound(settled.max, locale),
      min: parseAmountBound(settled.min, locale),
    };
    if (next.min === applied.current.min && next.max === applied.current.max) {
      return;
    }
    applied.current = next;
    onRangeChange(next);
  }, [locale, onRangeChange, settled]);

  const isActive = range.min > 0 || range.max > 0;
  // A floor above the ceiling matches nothing. The filter still applies as
  // typed — an empty list is the honest answer — and says why.
  const isImpossible = range.min > 0 && range.max > 0 && range.min > range.max;
  const symbol = currencySymbol();

  return (
    <Popover
      onOpenChange={(open) => {
        // Reopening re-reads the URL: Back, a shared link or Clear all may have
        // moved the bounds while the popup was closed.
        if (open) {
          applied.current = range;
          setDraft(draftOf(range));
        }
      }}
    >
      <PopoverTrigger render={<Button variant="outline" />}>
        <RiCoinsLine data-icon="inline-start" />
        {m.budget_filter_amount()}
        {isActive && <Badge variant="secondary">1</Badge>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-2.5">
        <div className="flex items-end gap-2">
          <Field>
            <FieldLabel htmlFor="budget-amount-min">
              {m.budget_filter_amount_min()}
            </FieldLabel>
            <InputGroup>
              <InputGroupAddon>{symbol}</InputGroupAddon>
              <InputGroupInput
                aria-invalid={isImpossible}
                id="budget-amount-min"
                inputMode="decimal"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    min: event.target.value,
                  }))
                }
                placeholder={m.budget_filter_amount_any()}
                value={draft.min}
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="budget-amount-max">
              {m.budget_filter_amount_max()}
            </FieldLabel>
            <InputGroup>
              <InputGroupAddon>{symbol}</InputGroupAddon>
              <InputGroupInput
                aria-invalid={isImpossible}
                id="budget-amount-max"
                inputMode="decimal"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    max: event.target.value,
                  }))
                }
                placeholder={m.budget_filter_amount_any()}
                value={draft.max}
              />
            </InputGroup>
          </Field>
        </div>
        <PopoverDescription className={isImpossible ? "text-destructive" : ""}>
          {isImpossible
            ? m.budget_filter_amount_impossible()
            : m.budget_filter_amount_hint()}
        </PopoverDescription>
        {isActive && (
          <Button
            className="self-start"
            onClick={() => {
              // A pressed button answers now; the debounce is for typing.
              applied.current = EMPTY_AMOUNT_RANGE;
              setDraft({ max: "", min: "" });
              onRangeChange(EMPTY_AMOUNT_RANGE);
            }}
            variant="ghost"
          >
            {m.budget_filter_amount_clear()}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

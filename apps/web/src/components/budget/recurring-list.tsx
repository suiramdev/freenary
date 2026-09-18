import {
  TabItem,
  TabPanel,
  Tabs,
  TabsList,
} from "@freenary/ui/components/tabs";
import { RiCoinsLine, RiRepeatLine } from "@remixicon/react";

import { AmountFilterMenu } from "@/components/budget/amount-filter-menu";
import { CategoryFilterMenu } from "@/components/budget/category-filter-menu";
import {
  ClearFiltersButton,
  ListFilterBar,
  ListFilterChip,
  ListFilterChips,
  ListSearchInput,
  ListSortToggle,
} from "@/components/budget/list-controls";
import { RecurrenceFilterMenu } from "@/components/budget/recurrence-filter-menu";
import { RecurringTable } from "@/components/budget/recurring-table";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import {
  confidenceLabel,
  frequencyLabel,
  sectionHint,
} from "@/lib/budget/recurrence-labels";
import type {
  RecurrenceConfidence,
  RecurrenceFrequency,
  RecurrenceKind,
} from "@/lib/budget/recurring";
import {
  recurringFilterCount,
  toggleConfidence,
  toggleFrequency,
} from "@/lib/budget/recurring-filters";
import type {
  RecurringFilter,
  RecurringGroups,
} from "@/lib/budget/recurring-filters";
import type { RecurringSortMode } from "@/lib/budget/search";
import { EMPTY_AMOUNT_RANGE } from "@/lib/budget/transaction-filters";
import type { AmountRange } from "@/lib/budget/transaction-filters";
import { m } from "@/paraglide/messages.js";

interface RecurringListProps {
  asOf: Date;
  currency: string;
  filter: RecurringFilter;
  groups: RecurringGroups;
  isError: boolean;
  isPending: boolean;
  kind: RecurrenceKind;
  onAmountChange: (amount: AmountRange) => void;
  onCategoriesChange: (filter: CategoryFilter) => void;
  onClearFilters: () => void;
  onConfidencesChange: (confidences: RecurrenceConfidence[]) => void;
  onFrequenciesChange: (frequencies: RecurrenceFrequency[]) => void;
  onKindChange: (kind: RecurrenceKind) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: RecurringSortMode) => void;
  search: string;
  sort: RecurringSortMode;
}

const SORT_OPTIONS = [
  { label: m.budget_recurring_sort_cost, value: "cost" },
  { label: m.budget_recurring_sort_next, value: "next" },
] as const satisfies readonly {
  label: () => string;
  value: RecurringSortMode;
}[];

const amountLabel = (amount: AmountRange): string => {
  const max = formatCurrency(Math.round(amount.max * 100));
  const min = formatCurrency(Math.round(amount.min * 100));

  if (amount.min > 0 && amount.max > 0) {
    return m.budget_filter_amount_between({ max, min });
  }

  return amount.min > 0
    ? m.budget_filter_amount_from({ amount: min })
    : m.budget_filter_amount_upto({ amount: max });
};

const KIND_TAB_LABELS = {
  behavioral: m.budget_recurring_tab_patterns,
  fixed: m.budget_recurring_tab_commitments,
} satisfies Record<RecurrenceKind, (input: { amount: string }) => string>;

const KIND_TABS = ["fixed", "behavioral"] as const satisfies RecurrenceKind[];

export const RecurringList = ({
  asOf,
  currency,
  filter,
  groups,
  isError,
  isPending,
  kind,
  onAmountChange,
  onCategoriesChange,
  onClearFilters,
  onConfidencesChange,
  onFrequenciesChange,
  onKindChange,
  onSearchChange,
  onSortChange,
  search,
  sort,
}: RecurringListProps) => {
  const activeCount = recurringFilterCount(filter);
  const hasAmountBound = filter.amount.min > 0 || filter.amount.max > 0;
  const { categories } = filter;
  const hasStripChip =
    filter.frequencies.length > 0 ||
    filter.confidences.length > 0 ||
    hasAmountBound;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ListFilterBar>
        <ListSearchInput
          onChange={onSearchChange}
          placeholder={m.budget_recurring_search_placeholder()}
          value={search}
        />
        <ListSortToggle
          label={m.budget_sort_label()}
          onChange={onSortChange}
          options={SORT_OPTIONS.map((option) => ({
            label: option.label(),
            value: option.value,
          }))}
          value={sort}
        />
        <AmountFilterMenu
          hint={m.budget_recurring_filter_cost_hint()}
          label={m.budget_recurring_filter_cost()}
          onRangeChange={onAmountChange}
          range={filter.amount}
        />
        <RecurrenceFilterMenu
          confidences={filter.confidences}
          frequencies={filter.frequencies}
          onConfidencesChange={onConfidencesChange}
          onFrequenciesChange={onFrequenciesChange}
        />
        <CategoryFilterMenu
          filter={categories}
          onFilterChange={onCategoriesChange}
        />
      </ListFilterBar>

      {(hasStripChip || activeCount >= 2) && (
        <ListFilterChips>
          {(position) => (
            <>
              {filter.frequencies.map((frequency, index) => (
                <ListFilterChip
                  icon={<RiRepeatLine className="size-3.5" />}
                  key={frequency}
                  label={frequencyLabel(frequency)}
                  onRemove={() =>
                    onFrequenciesChange(
                      toggleFrequency(filter.frequencies, frequency)
                    )
                  }
                  position={position(index)}
                />
              ))}
              {filter.confidences.map((confidence, index) => (
                <ListFilterChip
                  key={confidence}
                  label={confidenceLabel(confidence)}
                  onRemove={() =>
                    onConfidencesChange(
                      toggleConfidence(filter.confidences, confidence)
                    )
                  }
                  position={position(filter.frequencies.length + index)}
                />
              ))}
              {hasAmountBound && (
                <ListFilterChip
                  icon={<RiCoinsLine className="size-3.5" />}
                  label={amountLabel(filter.amount)}
                  onRemove={() => onAmountChange(EMPTY_AMOUNT_RANGE)}
                  position={position(
                    filter.frequencies.length + filter.confidences.length
                  )}
                />
              )}
              {activeCount >= 2 && (
                <ClearFiltersButton onClear={onClearFilters} />
              )}
            </>
          )}
        </ListFilterChips>
      )}

      <Tabs
        className="flex flex-1 flex-col gap-3"
        onValueChange={(next) => {
          const chosen = KIND_TABS.find((candidate) => candidate === next);

          if (chosen) {
            onKindChange(chosen);
          }
        }}
        value={kind}
      >
        <TabsList>
          {KIND_TABS.map((candidate) => (
            <TabItem
              key={candidate}
              label={KIND_TAB_LABELS[candidate]({
                amount: formatCurrency(
                  groups[candidate].monthlyMinor,
                  currency
                ),
              })}
              value={candidate}
            />
          ))}
        </TabsList>
        {KIND_TABS.map((candidate) => (
          <TabPanel
            className="flex flex-1 flex-col gap-3"
            key={candidate}
            value={candidate}
          >
            <p className="text-muted-foreground text-xs">
              {sectionHint(candidate)}
            </p>
            <RecurringTable
              asOf={asOf}
              hasFilters={activeCount > 0 || search.length > 0}
              isError={isError}
              isPending={isPending}
              items={groups[candidate].items}
              kind={candidate}
            />
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
};

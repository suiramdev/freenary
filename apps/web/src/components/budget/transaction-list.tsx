import {
  categoryGroupAppearance,
  predefinedCategoryAppearance,
} from "@freenary/api/lib/categories";
import {
  TabItem,
  TabPanel,
  Tabs,
  TabsList,
} from "@freenary/ui/components/tabs";
import { RiCoinsLine, RiStore2Line } from "@remixicon/react";

import { AmountFilterMenu } from "@/components/budget/amount-filter-menu";
import { CategoryFilterMenu } from "@/components/budget/category-filter-menu";
import { CategoryIcon } from "@/components/budget/category-icon";
import {
  ClearFiltersButton,
  ListFilterBar,
  ListFilterChip,
  ListFilterChips,
  ListSearchInput,
  ListSortToggle,
} from "@/components/budget/list-controls";
import { MerchantFilterMenu } from "@/components/budget/merchant-filter-menu";
import { TransactionRows } from "@/components/budget/transaction-rows";
import { useHoverIntent } from "@/hooks/shared/use-hover-intent";
import {
  EMPTY_CATEGORY_FILTER,
  toggleCategory,
  toggleGroup,
} from "@/lib/budget/category-selection";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { TimeRange } from "@/lib/budget/period";
import type { SortMode, TransactionDirection } from "@/lib/budget/search";
import type { Transaction } from "@/lib/budget/transaction";
import {
  activeFilterCount,
  EMPTY_AMOUNT_RANGE,
  toggleMerchant,
} from "@/lib/budget/transaction-filters";
import type { AmountRange } from "@/lib/budget/transaction-filters";
import { categoryGroupLabel, categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

/** A category chip carries its group's mark, at chip scale. */
const CHIP_ICON_CLASS = "size-4 [&_svg]:size-2.5";

/** The amount filter as a chip reads: one bound, or the span between two. */
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

const SORT_OPTIONS = [
  { label: m.budget_sort_date, value: "date" },
  { label: m.budget_sort_amount, value: "amount" },
] as const satisfies readonly { label: () => string; value: SortMode }[];

export const TransactionList = ({
  amount,
  transactions,
  totals,
  direction,
  onDirectionChange,
  onDirectionIntent,
  from,
  to,
  search,
  onSearchChange,
  filter,
  onAmountChange,
  onFilterChange,
  merchants,
  onMerchantsChange,
  sort,
  onSortChange,
  onSortIntent,
  hasMore,
  onLoadMore,
  isLoading,
  isStale,
  onTransactionClick,
  range,
}: {
  amount: AmountRange;
  transactions: Transaction[];
  totals: { incoming: number; outgoing: number };
  direction: TransactionDirection;
  onDirectionChange: (dir: TransactionDirection) => void;
  onDirectionIntent: (dir: TransactionDirection) => void;
  from: Date;
  to: Date;
  search: string;
  onSearchChange: (search: string) => void;
  filter: CategoryFilter;
  onAmountChange: (amount: AmountRange) => void;
  onFilterChange: (filter: CategoryFilter) => void;
  merchants: string[];
  onMerchantsChange: (merchants: string[]) => void;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  onSortIntent: (sort: SortMode) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  isStale: boolean;
  onTransactionClick: (tx: Transaction) => void;
  range: TimeRange;
}) => {
  const directionIntent = useHoverIntent(onDirectionIntent);
  const outgoingLabel = m.budget_tab_outgoing({
    amount: formatCurrency(Math.abs(totals.outgoing), "EUR"),
  });
  const incomingLabel = m.budget_tab_incoming({
    amount: formatCurrency(totals.incoming, "EUR"),
  });
  const activeCount = activeFilterCount(filter, merchants, amount);
  const hasAmountBound = amount.min > 0 || amount.max > 0;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ListFilterBar>
        <ListSearchInput
          onChange={onSearchChange}
          placeholder={m.budget_search_placeholder()}
          value={search}
        />
        <ListSortToggle
          label={m.budget_sort_label()}
          onChange={onSortChange}
          onIntent={onSortIntent}
          options={SORT_OPTIONS.map((option) => ({
            label: option.label(),
            value: option.value,
          }))}
          value={sort}
        />
        <AmountFilterMenu onRangeChange={onAmountChange} range={amount} />
        <MerchantFilterMenu
          direction={direction}
          from={from}
          merchants={merchants}
          onMerchantsChange={onMerchantsChange}
          to={to}
        />
        <CategoryFilterMenu filter={filter} onFilterChange={onFilterChange} />
      </ListFilterBar>

      {activeCount > 0 && (
        <ListFilterChips>
          {filter.groups.map((group) => (
            <ListFilterChip
              icon={
                <CategoryIcon
                  {...categoryGroupAppearance(group)}
                  className={CHIP_ICON_CLASS}
                />
              }
              key={group}
              label={categoryGroupLabel(group)}
              onRemove={() => onFilterChange(toggleGroup(filter, group))}
            />
          ))}
          {filter.categories.map((cat) => (
            <ListFilterChip
              icon={
                <CategoryIcon
                  {...predefinedCategoryAppearance(cat)}
                  className={CHIP_ICON_CLASS}
                />
              }
              key={cat}
              label={categoryLabel(cat)}
              onRemove={() => onFilterChange(toggleCategory(filter, cat))}
            />
          ))}
          {merchants.map((merchant) => (
            <ListFilterChip
              icon={<RiStore2Line />}
              key={merchant}
              label={merchant}
              onRemove={() =>
                onMerchantsChange(toggleMerchant(merchants, merchant))
              }
              truncate={true}
            />
          ))}
          {hasAmountBound && (
            <ListFilterChip
              icon={<RiCoinsLine />}
              label={amountLabel(amount)}
              onRemove={() => onAmountChange(EMPTY_AMOUNT_RANGE)}
            />
          )}
          {activeCount >= 2 && (
            <ClearFiltersButton
              onClear={() => {
                onFilterChange(EMPTY_CATEGORY_FILTER);
                onMerchantsChange([]);
                onAmountChange(EMPTY_AMOUNT_RANGE);
              }}
            />
          )}
        </ListFilterChips>
      )}

      <Tabs
        value={direction}
        // SAFETY: TabItem values are constrained to the two directions
        onValueChange={(v) => onDirectionChange(v as TransactionDirection)}
        className="flex flex-1 flex-col"
      >
        <TabsList>
          <TabItem
            label={outgoingLabel}
            value="outgoing"
            {...(direction === "outgoing"
              ? undefined
              : directionIntent("outgoing"))}
          />
          <TabItem
            label={incomingLabel}
            value="incoming"
            {...(direction === "incoming"
              ? undefined
              : directionIntent("incoming"))}
          />
        </TabsList>
        <TabPanel value="outgoing" className="flex flex-1 flex-col">
          <TransactionRows
            transactions={transactions}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
            isIncoming={false}
            isStale={isStale}
            onTransactionClick={onTransactionClick}
            range={range}
          />
        </TabPanel>
        <TabPanel value="incoming" className="flex flex-1 flex-col">
          <TransactionRows
            transactions={transactions}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
            isIncoming={true}
            isStale={isStale}
            onTransactionClick={onTransactionClick}
            range={range}
          />
        </TabPanel>
      </Tabs>
    </div>
  );
};

import type { TransactionFilter } from "@freenary/api/lib/transaction-filters";
import { Tabs, TabsItem, TabsPanel } from "@freenary/ui/components/tabs";
import { useId } from "react";

import type { Transaction } from "@/entities/budget";
import { m } from "@/paraglide/messages.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import { useHoverIntent } from "../lib/use-hover-intent";
import type { TimeRange } from "../model/period";
import type { SortMode, TransactionDirection } from "../model/search";
import { FilterTokenSearch } from "./filter-token-search";
import { ListFilterBar, ListSortToggle } from "./list-controls";
import { SavedFiltersMenu } from "./saved-filters-menu";
import { TransactionRows } from "./transaction-rows";

const DIRECTIONS = [
  "outgoing",
  "incoming",
] as const satisfies readonly TransactionDirection[];

const SORT_OPTIONS = [
  { label: m.budget_sort_date, value: "date" },
  { label: m.budget_sort_amount, value: "amount" },
] as const satisfies readonly { label: () => string; value: SortMode }[];

export const TransactionList = ({
  transactions,
  currency,
  totals,
  direction,
  onDirectionChange,
  onDirectionIntent,
  from,
  to,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onSearchReplace,
  sort,
  onSortChange,
  onSortIntent,
  hasMore,
  onLoadMore,
  isLoading,
  isError,
  isRetrying,
  onRetry,
  isStale,
  onTransactionClick,
  range,
}: {
  transactions: Transaction[];
  currency: string;
  totals: { incoming: number; outgoing: number };
  direction: TransactionDirection;
  onDirectionChange: (dir: TransactionDirection) => void;
  onDirectionIntent: (dir: TransactionDirection) => void;
  from: Date;
  to: Date;
  search: string;
  onSearchChange: (search: string) => void;
  filters: TransactionFilter[];
  onFiltersChange: (filters: TransactionFilter[]) => void;
  onSearchReplace: (next: {
    filters: TransactionFilter[];
    search: string;
  }) => void;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  onSortIntent: (sort: SortMode) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  isStale: boolean;
  onTransactionClick: (tx: Transaction) => void;
  range: TimeRange;
}) => {
  const directionIntent = useHoverIntent(onDirectionIntent);
  const tabsId = useId();
  const selectedIndex = DIRECTIONS.indexOf(direction);

  const handleDirectionSelect = (index: number) => {
    const next = DIRECTIONS[index];

    if (next) {
      onDirectionChange(next);
    }
  };

  const outgoingLabel = isError
    ? m.budget_tab_outgoing_unknown()
    : m.budget_tab_outgoing({
        amount: formatCurrency(Math.abs(totals.outgoing), currency),
      });

  const incomingLabel = isError
    ? m.budget_tab_incoming_unknown()
    : m.budget_tab_incoming({
        amount: formatCurrency(totals.incoming, currency),
      });

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ListFilterBar>
        <FilterTokenSearch
          currency={currency}
          direction={direction}
          filters={filters}
          from={from}
          onClear={() => onSearchReplace({ filters: [], search: "" })}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          search={search}
          to={to}
        />
        <SavedFiltersMenu
          filters={filters}
          onApply={onSearchReplace}
          search={search}
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
      </ListFilterBar>

      <div className="flex flex-1 flex-col">
        <Tabs
          idPrefix={tabsId}
          onSelect={handleDirectionSelect}
          selectedIndex={selectedIndex}
        >
          {DIRECTIONS.map((candidate, index) => (
            <TabsItem
              index={index}
              key={candidate}
              label={candidate === "incoming" ? incomingLabel : outgoingLabel}
              {...(direction === candidate
                ? undefined
                : directionIntent(candidate))}
            />
          ))}
        </Tabs>
        {DIRECTIONS.map((candidate, index) => (
          <TabsPanel
            className="flex flex-1 flex-col"
            idPrefix={tabsId}
            index={index}
            key={candidate}
            selectedIndex={selectedIndex}
          >
            <TransactionRows
              transactions={transactions}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
              isLoading={isLoading}
              isError={isError}
              isRetrying={isRetrying}
              onRetry={onRetry}
              isIncoming={candidate === "incoming"}
              isStale={isStale}
              onTransactionClick={onTransactionClick}
              range={range}
            />
          </TabsPanel>
        ))}
      </div>
    </div>
  );
};

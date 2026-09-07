import {
  categoryGroupAppearance,
  predefinedCategoryAppearance,
} from "@freenary/api/lib/categories";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@freenary/ui/components/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@freenary/ui/components/toggle-group";
import {
  RiCloseLine,
  RiCoinsLine,
  RiSearchLine,
  RiStore2Line,
} from "@remixicon/react";

import { AmountFilterMenu } from "@/components/budget/amount-filter-menu";
import { CategoryFilterMenu } from "@/components/budget/category-filter-menu";
import { CategoryIcon } from "@/components/budget/category-icon";
import { MerchantFilterMenu } from "@/components/budget/merchant-filter-menu";
import { TransactionRows } from "@/components/budget/transaction-rows";
import {
  EMPTY_CATEGORY_FILTER,
  toggleCategory,
  toggleGroup,
} from "@/lib/budget/category-selection";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { TimeRange } from "@/lib/budget/period";
import { SORT_MODES } from "@/lib/budget/search";
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

/** Toggle's sm size sits below the outline trigger beside it, and Toggle
    carries no press feedback of its own. */
const SORT_ITEM_CLASS =
  "h-7 text-xs/relaxed transition-transform duration-150 ease-out active:scale-[0.96]";

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

export const TransactionList = ({
  amount,
  transactions,
  totals,
  direction,
  onDirectionChange,
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
  hasMore,
  onLoadMore,
  isLoading,
  onTransactionClick,
  range,
}: {
  amount: AmountRange;
  transactions: Transaction[];
  totals: { incoming: number; outgoing: number };
  direction: TransactionDirection;
  onDirectionChange: (dir: TransactionDirection) => void;
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
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  onTransactionClick: (tx: Transaction) => void;
  range: TimeRange;
}) => {
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
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-40 flex-1">
          <InputGroupAddon>
            <RiSearchLine />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={m.budget_search_placeholder()}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            type="search"
          />
        </InputGroup>
        <ToggleGroup
          aria-label={m.budget_sort_label()}
          value={[sort]}
          onValueChange={([next]) => {
            const mode = SORT_MODES.find((candidate) => candidate === next);
            if (mode) {
              onSortChange(mode);
            }
          }}
          size="sm"
          spacing={0}
          variant="outline"
        >
          <ToggleGroupItem className={SORT_ITEM_CLASS} value="date">
            {m.budget_sort_date()}
          </ToggleGroupItem>
          <ToggleGroupItem className={SORT_ITEM_CLASS} value="amount">
            {m.budget_sort_amount()}
          </ToggleGroupItem>
        </ToggleGroup>
        <AmountFilterMenu onRangeChange={onAmountChange} range={amount} />
        <MerchantFilterMenu
          direction={direction}
          from={from}
          merchants={merchants}
          onMerchantsChange={onMerchantsChange}
          to={to}
        />
        <CategoryFilterMenu filter={filter} onFilterChange={onFilterChange} />
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filter.groups.map((group) => (
            <Badge
              key={group}
              className="hover:bg-muted"
              render={
                <button
                  aria-label={m.budget_filter_remove({
                    label: categoryGroupLabel(group),
                  })}
                  type="button"
                  onClick={() => onFilterChange(toggleGroup(filter, group))}
                />
              }
              variant="outline"
            >
              <CategoryIcon
                {...categoryGroupAppearance(group)}
                className="size-4 [&_svg]:size-2.5"
              />
              {categoryGroupLabel(group)}
              <RiCloseLine data-icon="inline-end" />
            </Badge>
          ))}
          {filter.categories.map((cat) => (
            <Badge
              key={cat}
              className="hover:bg-muted"
              render={
                <button
                  aria-label={m.budget_filter_remove({
                    label: categoryLabel(cat),
                  })}
                  type="button"
                  onClick={() => onFilterChange(toggleCategory(filter, cat))}
                />
              }
              variant="outline"
            >
              <CategoryIcon
                {...predefinedCategoryAppearance(cat)}
                className="size-4 [&_svg]:size-2.5"
              />
              {categoryLabel(cat)}
              <RiCloseLine data-icon="inline-end" />
            </Badge>
          ))}
          {merchants.map((merchant) => (
            <Badge
              key={merchant}
              className="hover:bg-muted max-w-48"
              render={
                <button
                  aria-label={m.budget_filter_remove({ label: merchant })}
                  type="button"
                  onClick={() =>
                    onMerchantsChange(toggleMerchant(merchants, merchant))
                  }
                />
              }
              variant="outline"
            >
              <RiStore2Line />
              <span className="min-w-0 truncate">{merchant}</span>
              <RiCloseLine data-icon="inline-end" />
            </Badge>
          ))}
          {hasAmountBound && (
            <Badge
              className="hover:bg-muted"
              render={
                <button
                  aria-label={m.budget_filter_remove({
                    label: amountLabel(amount),
                  })}
                  type="button"
                  onClick={() => onAmountChange(EMPTY_AMOUNT_RANGE)}
                />
              }
              variant="outline"
            >
              <RiCoinsLine />
              {amountLabel(amount)}
              <RiCloseLine data-icon="inline-end" />
            </Badge>
          )}
          {activeCount >= 2 && (
            <Button
              variant="ghost"
              onClick={() => {
                onFilterChange(EMPTY_CATEGORY_FILTER);
                onMerchantsChange([]);
                onAmountChange(EMPTY_AMOUNT_RANGE);
              }}
            >
              {m.budget_filter_clear_all()}
            </Button>
          )}
        </div>
      )}

      <Tabs
        value={direction}
        // SAFETY: TabsTrigger values are constrained to the two directions
        onValueChange={(v) => onDirectionChange(v as TransactionDirection)}
        className="flex flex-1 flex-col"
      >
        <TabsList variant="line">
          <TabsTrigger value="outgoing">{outgoingLabel}</TabsTrigger>
          <TabsTrigger value="incoming">{incomingLabel}</TabsTrigger>
        </TabsList>
        <TabsContent value="outgoing" className="flex flex-1 flex-col">
          <TransactionRows
            transactions={transactions}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
            isIncoming={false}
            onTransactionClick={onTransactionClick}
            range={range}
          />
        </TabsContent>
        <TabsContent value="incoming" className="flex flex-1 flex-col">
          <TransactionRows
            transactions={transactions}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
            isIncoming={true}
            onTransactionClick={onTransactionClick}
            range={range}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

import {
  categoryGroupAppearance,
  predefinedCategoryAppearance,
} from "@freenary/api/lib/categories";
import { CATEGORY_GROUPS, categoriesInGroup } from "@freenary/api/lib/taxonomy";
import type {
  CategoryGroup,
  SpendingCategory,
} from "@freenary/api/lib/taxonomy";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
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
import { RiCloseLine, RiFilter3Line, RiSearchLine } from "@remixicon/react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { TransactionRows } from "@/components/budget/transaction-rows";
import {
  EMPTY_CATEGORY_FILTER,
  filterCount,
} from "@/lib/budget/category-selection";
import type { CategoryFilter } from "@/lib/budget/category-selection";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { TimeRange } from "@/lib/budget/period";
import type { Transaction } from "@/lib/budget/transaction";
import { categoryGroupLabel, categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

export const TransactionList = ({
  transactions,
  totals,
  direction,
  onDirectionChange,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  hasMore,
  onLoadMore,
  isLoading,
  onTransactionClick,
  range,
}: {
  transactions: Transaction[];
  totals: { incoming: number; outgoing: number };
  direction: "incoming" | "outgoing";
  onDirectionChange: (dir: "incoming" | "outgoing") => void;
  search: string;
  onSearchChange: (search: string) => void;
  filter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
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
  const activeCount = filterCount(filter);

  const toggleCategory = (category: SpendingCategory) => {
    onFilterChange({
      ...filter,
      categories: filter.categories.includes(category)
        ? filter.categories.filter((c) => c !== category)
        : [...filter.categories, category],
    });
  };

  // Selecting a group filters on the whole group rather than expanding into
  // nine category chips the user then has to unpick one by one. Its categories
  // are dropped because the server unions them in anyway, so their chips would
  // count toward the badge while changing no result.
  const toggleGroup = (group: CategoryGroup) => {
    if (filter.groups.includes(group)) {
      onFilterChange({
        ...filter,
        groups: filter.groups.filter((g) => g !== group),
      });
      return;
    }
    const covered = new Set<SpendingCategory>(categoriesInGroup(group));
    onFilterChange({
      categories: filter.categories.filter((c) => !covered.has(c)),
      groups: [...filter.groups, group],
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <InputGroup className="flex-1">
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
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <RiFilter3Line data-icon="inline-start" />
            {m.budget_filter_category()}
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount}</Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-96 min-w-64 overflow-y-auto"
          >
            {CATEGORY_GROUPS.map((group) => (
              <DropdownMenuGroup key={group}>
                <DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={filter.groups.includes(group)}
                    onCheckedChange={() => toggleGroup(group)}
                  >
                    <CategoryIcon
                      {...categoryGroupAppearance(group)}
                      className="size-5 [&_svg]:size-3"
                    />
                    {categoryGroupLabel(group)}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuLabel>
                {categoriesInGroup(group).map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat}
                    // The server unions groups into their categories, so a
                    // ticked group already covers these rows; showing them
                    // unchecked would misreport what is being filtered, and
                    // toggling one would change no result.
                    checked={
                      filter.groups.includes(group) ||
                      filter.categories.includes(cat)
                    }
                    disabled={filter.groups.includes(group)}
                    className="pl-8"
                    onCheckedChange={() => toggleCategory(cat)}
                  >
                    <CategoryIcon
                      {...predefinedCategoryAppearance(cat)}
                      className="size-5 [&_svg]:size-3"
                    />
                    {categoryLabel(cat)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
                  onClick={() => toggleGroup(group)}
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
                  onClick={() => toggleCategory(cat)}
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
          {activeCount >= 2 && (
            <Button
              variant="ghost"
              onClick={() => onFilterChange(EMPTY_CATEGORY_FILTER)}
            >
              {m.budget_filter_clear_all()}
            </Button>
          )}
        </div>
      )}

      <Tabs
        value={direction}
        // SAFETY: TabsTrigger values are constrained to "incoming" | "outgoing"
        onValueChange={(v) => onDirectionChange(v as "incoming" | "outgoing")}
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

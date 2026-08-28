import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import { Checkbox } from "@freenary/ui/components/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@freenary/ui/components/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@freenary/ui/components/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@freenary/ui/components/tabs";
import { FunnelIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

import { CategoryIcon } from "@/components/budget/category-icon";
import { TransactionRows } from "@/components/budget/transaction-rows";
import { formatCurrency } from "@/lib/budget/format-currency";
import type { TimeRange } from "@/lib/budget/period";
import type { Transaction } from "@/lib/budget/transaction";

export const TransactionList = ({
  transactions,
  totals,
  direction,
  onDirectionChange,
  search,
  onSearchChange,
  categories,
  onCategoriesChange,
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
  categories: SpendingCategory[];
  onCategoriesChange: (categories: SpendingCategory[]) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  onTransactionClick: (tx: Transaction) => void;
  range: TimeRange;
}) => {
  const outgoingLabel = `Outgoing · ${formatCurrency(Math.abs(totals.outgoing), "EUR")}`;
  const incomingLabel = `Incoming · ${formatCurrency(totals.incoming, "EUR")}`;

  const toggleCategory = (cat: SpendingCategory) => {
    if (categories.includes(cat)) {
      onCategoriesChange(categories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...categories, cat]);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            type="search"
          />
        </InputGroup>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5" />
            }
          >
            <FunnelIcon className="size-3.5" />
            Category
            {categories.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 px-1.5">
                {categories.length}
              </Badge>
            )}
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="flex max-h-72 flex-col gap-0 overflow-y-auto p-1"
          >
            {SPENDING_CATEGORIES.map((cat) => {
              const appearance = predefinedCategoryAppearance(cat);
              const checked = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  onClick={() => toggleCategory(cat)}
                >
                  <Checkbox checked={checked} tabIndex={-1} />
                  <CategoryIcon
                    {...appearance}
                    className="size-5 [&_svg]:size-3"
                  />
                  <span>{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <Badge key={cat} variant="outline" className="gap-1 pr-1">
              <CategoryIcon
                {...predefinedCategoryAppearance(cat)}
                className="size-4 [&_svg]:size-2.5"
              />
              {CATEGORY_LABELS[cat]}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground ml-0.5 rounded-full p-0.5"
                onClick={() => toggleCategory(cat)}
              >
                <XIcon className="size-3" />
                <span className="sr-only">
                  Remove {CATEGORY_LABELS[cat]} filter
                </span>
              </button>
            </Badge>
          ))}
          {categories.length >= 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-auto px-1.5 py-0.5 text-xs"
              onClick={() => onCategoriesChange([])}
            >
              Clear all
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

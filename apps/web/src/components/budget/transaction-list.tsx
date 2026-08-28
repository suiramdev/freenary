import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import { Badge } from "@freenary/ui/components/badge";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
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
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <FunnelIcon data-icon="inline-start" />
            Category
            {categories.length > 0 && (
              <Badge variant="secondary">{categories.length}</Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuGroup>
              {SPENDING_CATEGORIES.map((cat) => (
                <DropdownMenuCheckboxItem
                  key={cat}
                  checked={categories.includes(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                >
                  <CategoryIcon
                    {...predefinedCategoryAppearance(cat)}
                    className="size-5 [&_svg]:size-3"
                  />
                  {CATEGORY_LABELS[cat]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <Badge
              key={cat}
              className="hover:bg-muted"
              render={
                <button
                  aria-label={`Remove ${CATEGORY_LABELS[cat]} filter`}
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
              {CATEGORY_LABELS[cat]}
              <XIcon data-icon="inline-end" />
            </Badge>
          ))}
          {categories.length >= 2 && (
            <Button
              size="xs"
              variant="ghost"
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

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
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
  MagnifyingGlass,
  Receipt,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterpartyName: string | null;
}

interface TransactionListProps {
  transactions: Transaction[];
  totals: { incoming: number; outgoing: number };
  direction: "incoming" | "outgoing";
  onDirectionChange: (dir: "incoming" | "outgoing") => void;
  search: string;
  onSearchChange: (search: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  formatAmount: (amount: number, currency: string) => string;
}

const ROW_HEIGHT = 56;

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

const TransactionRows = ({
  transactions,
  hasMore,
  onLoadMore,
  isLoading,
  formatAmount,
  isIncoming,
}: {
  transactions: Transaction[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  formatAmount: (amount: number, currency: string) => string;
  isIncoming: boolean;
}) => {
  "use no memo";
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react/incompatible-library -- useVirtualizer is inherently incompatible with React Compiler; component opts out via "use no memo"
  const virtualizer = useVirtualizer({
    count: transactions.length,
    estimateSize: () => ROW_HEIGHT,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();

  const loadMoreCheck = useCallback(() => {
    if (!hasMore || isLoading) {
      return;
    }
    const lastItem = items.at(-1);
    if (lastItem && lastItem.index >= transactions.length - 5) {
      onLoadMore();
    }
  }, [hasMore, isLoading, items, transactions.length, onLoadMore]);

  useEffect(() => {
    loadMoreCheck();
  }, [loadMoreCheck]);

  if (transactions.length === 0 && !isLoading) {
    return (
      <Empty className="border-none py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Receipt />
          </EmptyMedia>
          <EmptyTitle>No transactions</EmptyTitle>
          <EmptyDescription>
            No {isIncoming ? "incoming" : "outgoing"} transactions found for
            this period.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {items.map((virtualRow) => {
          const tx = transactions[virtualRow.index];
          if (!tx) {
            return null;
          }
          return (
            <div
              key={tx.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="border-border hover:bg-muted/50 absolute inset-x-0 flex items-center justify-between gap-4 border-b px-1 py-3 transition-colors duration-150"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-xs font-medium">
                  {tx.counterpartyName ?? tx.description}
                </span>
                <span className="text-muted-foreground truncate text-[10px]">
                  {tx.counterpartyName ? tx.description : ""} ·{" "}
                  {formatDate(tx.date)}
                </span>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium tabular-nums",
                  isIncoming ? "text-primary" : "text-foreground"
                )}
              >
                {formatAmount(tx.amount, tx.currency)}
              </span>
            </div>
          );
        })}
      </div>
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <SpinnerGapIcon className="text-muted-foreground size-4 animate-spin" />
        </div>
      )}
    </div>
  );
};

export const TransactionList = ({
  transactions,
  totals,
  direction,
  onDirectionChange,
  search,
  onSearchChange,
  hasMore,
  onLoadMore,
  isLoading,
  formatAmount,
}: TransactionListProps) => {
  const outgoingLabel = `Outgoing · ${formatAmount(Math.abs(totals.outgoing), "EUR")}`;
  const incomingLabel = `Incoming · ${formatAmount(totals.incoming, "EUR")}`;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <InputGroup>
        <InputGroupAddon>
          <MagnifyingGlass />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          type="search"
        />
      </InputGroup>
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
            formatAmount={formatAmount}
            isIncoming={false}
          />
        </TabsContent>
        <TabsContent value="incoming" className="flex flex-1 flex-col">
          <TransactionRows
            transactions={transactions}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
            formatAmount={formatAmount}
            isIncoming={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export type { Transaction, TransactionListProps };

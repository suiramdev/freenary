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
import { useCallback, useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterpartyName: string | null;
}

type TimeRange = "1M" | "3M" | "1Y";

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
  range: TimeRange;
}

type VirtualItem =
  | { type: "header"; key: string; label: string; total: number; currency: string }
  | { type: "tx"; key: string; tx: Transaction };

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 56;

/**
 * Build a grouping key from a date string.
 * 1M → day, 3M → week (ISO week starting Monday), 1Y → month.
 */
const groupKey = (dateStr: string, range: TimeRange): string => {
  const d = new Date(dateStr);

  if (range === "1Y") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  if (range === "3M") {
    // ISO week: find Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return `${monday.getFullYear()}-W${String(Math.ceil((monday.getDate() + new Date(monday.getFullYear(), monday.getMonth(), 1).getDay()) / 7)).padStart(2, "0")}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  }

  // 1M → day
  return d.toISOString().slice(0, 10);
};

const formatGroupLabel = (key: string, range: TimeRange): string => {
  if (range === "1Y") {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  if (range === "3M") {
    // key is like "2025-W03-08-12" — extract the monday date from the last parts
    const parts = key.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[2]) - 1;
    const day = Number(parts[3]);
    const monday = new Date(year, month, day);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const fmtShort = (d: Date) =>
      d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

    return `${fmtShort(monday)} – ${fmtShort(sunday)}`;
  }

  // 1M → day
  const d = new Date(`${key}T00:00:00`);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (key === today) {
    return "Today";
  }
  if (key === yesterdayStr) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const buildVirtualItems = (
  transactions: Transaction[],
  range: TimeRange,
): VirtualItem[] => {
  if (transactions.length === 0) {
    return [];
  }

  const items: VirtualItem[] = [];
  let currentKey = "";
  let groupTotal = 0;
  let groupCurrency = "EUR";
  let headerIdx = -1;

  for (const tx of transactions) {
    const key = groupKey(tx.date, range);
    if (key !== currentKey) {
      // Patch the previous header's total
      if (headerIdx >= 0) {
        const header = items[headerIdx] as Extract<VirtualItem, { type: "header" }>;
        header.total = groupTotal;
      }
      currentKey = key;
      groupTotal = 0;
      groupCurrency = tx.currency;
      headerIdx = items.length;
      items.push({
        type: "header",
        key: `header-${key}`,
        label: formatGroupLabel(key, range),
        total: 0,
        currency: groupCurrency,
      });
    }
    groupTotal += tx.amount;
    items.push({ type: "tx", key: tx.id, tx });
  }

  // Patch last header
  if (headerIdx >= 0) {
    const header = items[headerIdx] as Extract<VirtualItem, { type: "header" }>;
    header.total = groupTotal;
  }

  return items;
};

const TransactionRows = ({
  transactions,
  hasMore,
  onLoadMore,
  isLoading,
  formatAmount,
  isIncoming,
  range,
}: {
  transactions: Transaction[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  formatAmount: (amount: number, currency: string) => string;
  isIncoming: boolean;
  range: TimeRange;
}) => {
  "use no memo";
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualItems = useMemo(
    () => buildVirtualItems(transactions, range),
    [transactions, range],
  );

  // eslint-disable-next-line react/incompatible-library -- useVirtualizer is inherently incompatible with React Compiler; component opts out via "use no memo"
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    estimateSize: (index) =>
      virtualItems[index]?.type === "header" ? HEADER_HEIGHT : ROW_HEIGHT,
    getScrollElement: () => parentRef.current,
    overscan: 10,
  });

  const visibleItems = virtualizer.getVirtualItems();

  const loadMoreCheck = useCallback(() => {
    if (!hasMore || isLoading) {
      return;
    }
    const lastItem = visibleItems.at(-1);
    if (lastItem && lastItem.index >= virtualItems.length - 5) {
      onLoadMore();
    }
  }, [hasMore, isLoading, visibleItems, virtualItems.length, onLoadMore]);

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
        {visibleItems.map((virtualRow) => {
          const item = virtualItems[virtualRow.index];
          if (!item) {
            return null;
          }

          if (item.type === "header") {
            return (
              <div
                key={item.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="text-muted-foreground absolute inset-x-0 flex items-center justify-between px-1 pt-4 pb-1.5 text-[11px] font-medium"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <span>{item.label}</span>
                <span className="tabular-nums">
                  {formatAmount(item.total, item.currency)}
                </span>
              </div>
            );
          }

          const { tx } = item;
          return (
            <div
              key={item.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="border-border hover:bg-muted/50 absolute inset-x-0 flex items-center justify-between gap-4 border-b px-1 py-3 transition-colors duration-150"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-xs font-medium">
                  {tx.counterpartyName ?? tx.description}
                </span>
                {tx.counterpartyName && tx.description ? (
                  <span className="text-muted-foreground truncate text-[10px]">
                    {tx.description}
                  </span>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium tabular-nums",
                  isIncoming ? "text-success" : "text-destructive",
                )}
              >
                {isIncoming ? "+" : "−"}
                {formatAmount(Math.abs(tx.amount), tx.currency)}
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
  range,
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
            range={range}
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
            range={range}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export type { Transaction, TransactionListProps, TimeRange };

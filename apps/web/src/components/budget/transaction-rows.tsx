import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { ReceiptIcon } from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { TransactionGroupHeader } from "@/components/budget/transaction-group-header";
import { TransactionRow } from "@/components/budget/transaction-row";
import { TransactionRowsSkeleton } from "@/components/budget/transaction-rows-skeleton";
import type { TimeRange } from "@/lib/budget/period";
import type { Transaction } from "@/lib/budget/transaction";
import {
  buildVirtualItems,
  HEADER_HEIGHT,
  ROW_HEIGHT,
} from "@/lib/budget/transaction-groups";

export const TransactionRows = ({
  transactions,
  hasMore,
  onLoadMore,
  isLoading,
  isIncoming,
  onTransactionClick,
  range,
}: {
  transactions: Transaction[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  isIncoming: boolean;
  onTransactionClick: (tx: Transaction) => void;
  range: TimeRange;
}) => {
  "use no memo";
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualItems = useMemo(
    () => buildVirtualItems(transactions, range),
    [transactions, range]
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
            <ReceiptIcon />
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
    <div
      ref={parentRef}
      aria-busy={isLoading || undefined}
      className="flex-1 overflow-auto"
    >
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
              <TransactionGroupHeader
                key={item.key}
                label={item.label}
                total={item.total}
                currency={item.currency}
                index={virtualRow.index}
                offset={virtualRow.start}
                measureRef={virtualizer.measureElement}
              />
            );
          }

          return (
            <TransactionRow
              key={item.key}
              transaction={item.tx}
              isIncoming={isIncoming}
              index={virtualRow.index}
              offset={virtualRow.start}
              measureRef={virtualizer.measureElement}
              onClick={() => onTransactionClick(item.tx)}
            />
          );
        })}
      </div>
      {isLoading ? (
        <>
          <output className="sr-only">Loading transactions</output>
          <div aria-hidden="true">
            <TransactionRowsSkeleton rows={3} />
          </div>
        </>
      ) : null}
    </div>
  );
};

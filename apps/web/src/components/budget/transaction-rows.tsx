import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { RiReceiptLine } from "@remixicon/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { StaleRegion } from "@/components/budget/stale-region";
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
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

export const TransactionRows = ({
  transactions,
  hasMore,
  onLoadMore,
  isLoading,
  isIncoming,
  isStale,
  onTransactionClick,
  range,
}: {
  transactions: Transaction[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  isIncoming: boolean;
  isStale: boolean;
  onTransactionClick: (tx: Transaction) => void;
  range: TimeRange;
}) => {
  "use no memo";
  const parentRef = useRef<HTMLDivElement>(null);

  const locale = getLocale();
  const virtualItems = useMemo(
    () => buildVirtualItems(transactions, range, locale),
    [transactions, range, locale]
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
    // A placeholder's `hasNextPage` belongs to the previous view: fetching its
    // second page would page a list whose first page has not landed.
    if (!hasMore || isLoading || isStale) {
      return;
    }
    const lastItem = visibleItems.at(-1);
    if (lastItem && lastItem.index >= virtualItems.length - 5) {
      onLoadMore();
    }
  }, [
    hasMore,
    isLoading,
    isStale,
    visibleItems,
    virtualItems.length,
    onLoadMore,
  ]);

  useEffect(() => {
    loadMoreCheck();
  }, [loadMoreCheck]);

  if (transactions.length === 0 && !isLoading) {
    // The emptiness itself may belong to the previous view, and an unmarked
    // "no transactions" reads as the answer to the control just pressed.
    return (
      <StaleRegion className="flex flex-1 flex-col" isStale={isStale}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiReceiptLine />
            </EmptyMedia>
            <EmptyTitle>{m.budget_transactions_empty_title()}</EmptyTitle>
            <EmptyDescription>
              {isIncoming
                ? m.budget_transactions_empty_incoming()
                : m.budget_transactions_empty_outgoing()}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </StaleRegion>
    );
  }

  return (
    <div
      ref={parentRef}
      aria-busy={isLoading || undefined}
      className="flex-1 overflow-auto"
    >
      <StaleRegion isStale={isStale}>
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
            <output className="sr-only">
              {m.budget_transactions_loading()}
            </output>
            <div aria-hidden="true">
              <TransactionRowsSkeleton rows={3} />
            </div>
          </>
        ) : null}
      </StaleRegion>
    </div>
  );
};

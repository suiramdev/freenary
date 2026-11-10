import { Skeleton } from "@freenary/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { Transaction } from "@/entities/budget";
import {
  TransactionDetailDrawer,
  TransactionItem,
} from "@/features/transaction-details";
import { m } from "@/paraglide/messages.js";

import { RECENT_TRANSACTIONS_SHOWN } from "../model/dashboard";
import type { WidgetQuery } from "../model/widget-query";
import {
  WidgetAction,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

const RecentSkeleton = () => (
  <WidgetLoading label={m.home_recent_loading()}>
    {Array.from({ length: RECENT_TRANSACTIONS_SHOWN }, (_, index) => (
      <div className="flex items-center gap-3" key={index}>
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </WidgetLoading>
);

export const RecentTransactionsCard = ({
  query,
  today,
}: {
  query: WidgetQuery<Transaction[]>;
  today: Date;
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const transactions = query.data ?? [];
  const selected =
    transactions.find((transaction) => transaction.id === selectedId) ?? null;

  return (
    <WidgetCard
      action={
        <WidgetAction>
          <Link to="/budget/transactions">{m.home_recent_all()}</Link>
        </WidgetAction>
      }
      title={m.home_recent_title()}
    >
      {query.isPending ? <RecentSkeleton /> : null}
      {query.isError ? (
        <WidgetError
          isRetrying={query.isRetrying}
          message={m.home_recent_error()}
          onRetry={query.handleRetry}
        />
      ) : null}
      {query.data && transactions.length === 0 ? (
        <WidgetEmpty>{m.home_recent_empty()}</WidgetEmpty>
      ) : null}
      {transactions.length > 0 ? (
        <ul className="flex flex-col">
          {transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              onSelect={(picked) => setSelectedId(picked.id)}
              today={today}
              transaction={transaction}
            />
          ))}
        </ul>
      ) : null}
      <TransactionDetailDrawer
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        open={selectedId !== null}
        transaction={selected}
      />
    </WidgetCard>
  );
};

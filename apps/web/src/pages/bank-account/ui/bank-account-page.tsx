import { Button } from "@freenary/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  ACCOUNT_TYPE_LABELS,
  AccountBalance,
  accountName,
} from "@/entities/account";
import type { PortfolioAccount } from "@/entities/account";
import { latestTransactionsQueryOptions } from "@/entities/budget";
import type { Transaction } from "@/entities/budget";
import {
  TransactionDetailDrawer,
  TransactionItem,
} from "@/features/transaction-details";
import { m } from "@/paraglide/messages.js";
import { orpc } from "@/shared/api";

const route = getRouteApi("/_auth/accounts/$accountId");

const PAGE_SIZE = 30;
const SKELETON_ROWS = 6;

const AccountHeader = ({ account }: { account: PortfolioAccount }) => (
  <header className="flex flex-col gap-3 pt-2">
    <div className="flex flex-col gap-0.5">
      <h1 className="text-base font-medium break-words">
        {accountName(account)}
      </h1>
      <p className="text-muted-foreground text-sm">
        {m.home_accounts_meta({
          institution: account.institutionName,
          type: ACCOUNT_TYPE_LABELS[account.type](),
        })}
      </p>
    </div>
    <AccountBalance
      account={account}
      className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl"
    />
  </header>
);

const HeaderSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 pt-2">
    <output className="sr-only">{m.bank_account_loading()}</output>
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-9 w-56 sm:h-12 sm:w-64" />
    </div>
  </div>
);

const RowsSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-4 py-2">
    <output className="sr-only">{m.bank_account_transactions_loading()}</output>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <div aria-hidden="true" className="flex items-center gap-3" key={index}>
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

interface TransactionsListState {
  canLoadMore: boolean;
  isError: boolean;
  isLoaded: boolean;
  isLoadingMore: boolean;
  isPending: boolean;
  isRetrying: boolean;
  handleLoadMore: () => void;
  handleRetry: () => void;
  transactions: Transaction[];
}

const AccountTransactions = ({ list }: { list: TransactionsListState }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const today = new Date();

  const { transactions } = list;
  const selected =
    transactions.find((transaction) => transaction.id === selectedId) ?? null;

  return (
    <section
      aria-labelledby="account-transactions-title"
      className="flex flex-col gap-2"
    >
      <h2 className="text-sm font-medium" id="account-transactions-title">
        {m.nav_budget_transactions()}
      </h2>
      {list.isPending ? <RowsSkeleton /> : null}
      {list.isError ? (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-muted-foreground text-sm">
            {m.bank_account_transactions_error()}
          </p>
          <Button
            loading={list.isRetrying}
            onClick={list.handleRetry}
            size="compact"
            type="button"
            variant="tertiary"
          >
            {m.home_retry()}
          </Button>
        </div>
      ) : null}
      {list.isLoaded && transactions.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">
          {m.bank_account_transactions_empty()}
        </p>
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
      {list.canLoadMore ? (
        <div className="flex justify-center pt-2">
          <Button
            loading={list.isLoadingMore}
            onClick={list.handleLoadMore}
            size="compact"
            type="button"
            variant="tertiary"
          >
            {m.bank_account_transactions_more()}
          </Button>
        </div>
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
    </section>
  );
};

const AccountMissing = () => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>{m.bank_account_missing_title()}</EmptyTitle>
      <EmptyDescription>
        {m.bank_account_missing_description()}
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button render={<Link to="/" />} variant="tertiary">
        {m.bank_account_missing_home()}
      </Button>
    </EmptyContent>
  </Empty>
);

export const BankAccountPage = () => {
  const { accountId } = route.useParams();
  const overview = useQuery(orpc.portfolio.getOverview.queryOptions());
  const transactionsQuery = useInfiniteQuery(
    latestTransactionsQueryOptions({ accountId, pageSize: PAGE_SIZE })
  );

  const list: TransactionsListState = {
    canLoadMore: transactionsQuery.hasNextPage,
    handleLoadMore: () => {
      void transactionsQuery.fetchNextPage();
    },
    handleRetry: () => {
      void transactionsQuery.refetch();
    },
    isError: transactionsQuery.isError && transactionsQuery.data === undefined,
    isLoaded: transactionsQuery.data !== undefined,
    isLoadingMore: transactionsQuery.isFetchingNextPage,
    isPending: transactionsQuery.isPending,
    isRetrying: transactionsQuery.isFetching,
    transactions:
      transactionsQuery.data?.pages.flatMap((page) => page.transactions) ?? [],
  };

  const account = overview.data?.accounts.find(
    (candidate) => candidate.id === accountId
  );

  if (overview.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-4">
        <h1 className="sr-only">{m.nav_bank_account()}</h1>
        <HeaderSkeleton />
      </div>
    );
  }

  if (overview.isError && !overview.data) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h1 className="sr-only">{m.nav_bank_account()}</h1>
        <p className="text-muted-foreground text-sm">
          {m.home_accounts_error()}
        </p>
        <div>
          <Button
            loading={overview.isFetching}
            onClick={() => {
              void overview.refetch();
            }}
            size="compact"
            type="button"
            variant="tertiary"
          >
            {m.home_retry()}
          </Button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <>
        <h1 className="sr-only">{m.nav_bank_account()}</h1>
        <AccountMissing />
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4">
      <AccountHeader account={account} />
      <AccountTransactions list={list} />
    </div>
  );
};

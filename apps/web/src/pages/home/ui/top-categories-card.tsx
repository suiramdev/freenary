import { predefinedCategoryAppearance } from "@freenary/api/lib/categories";
import type { SpendingCategory } from "@freenary/api/lib/taxonomy";
import type { TransactionFilter } from "@freenary/api/lib/transaction-filters";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { Link } from "@tanstack/react-router";

import {
  CategoryIcon,
  categoryChartColor,
  categoryLabel,
} from "@/entities/category";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";
import { formatCurrency } from "@/shared/lib/format-currency";

import {
  TOP_CATEGORIES_SHOWN,
  topCategories,
  unsortedSpendMinor,
} from "../model/dashboard";
import type { CategoryShare } from "../model/dashboard";
import type { WidgetQuery } from "../model/widget-query";
import {
  WidgetAction,
  WidgetCard,
  WidgetEmpty,
  WidgetError,
  WidgetLoading,
} from "./widget-card";

interface Breakdown {
  categories: { amount: number; category: SpendingCategory }[];
  currency: string;
}

const SHARE_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 0,
  style: "percent",
};

const PERCENT = 100;
const SKELETON_ROWS = 4;

const TopCategoriesSkeleton = () => (
  <WidgetLoading label={m.home_categories_loading()}>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <div className="flex items-center gap-3" key={index}>
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4" />
          <Skeleton className="h-1.5 rounded-full" />
        </div>
      </div>
    ))}
  </WidgetLoading>
);

const CategoryRow = ({
  currency,
  percent,
  row,
}: {
  currency: string;
  percent: Intl.NumberFormat;
  row: CategoryShare;
}) => (
  <li className="flex items-center gap-3">
    <CategoryIcon
      {...predefinedCategoryAppearance(row.category)}
      className="size-8 [&_svg]:size-4"
    />
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="min-w-0 flex-1 break-words">
          {categoryLabel(row.category)}
        </span>
        <span className="tabular-nums">
          {formatCurrency(row.amountMinor, currency)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div aria-hidden="true" className="bg-muted h-1.5 flex-1 rounded-full">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: categoryChartColor(row.category),
              width: `${row.share * PERCENT}%`,
            }}
          />
        </div>
        <span className="text-muted-foreground w-11 shrink-0 text-end text-xs whitespace-nowrap tabular-nums">
          {percent.format(row.share)}
        </span>
      </div>
    </div>
  </li>
);

const UNSORTED_FILTER = [
  { field: "category", operator: "is", values: ["uncategorised"] },
] as const satisfies TransactionFilter[];

const UnsortedNote = ({
  amountMinor,
  currency,
}: {
  amountMinor: number;
  currency: string;
}) => (
  <p className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
    <span>
      {m.home_categories_unsorted({
        amount: formatCurrency(amountMinor, currency),
      })}
    </span>
    <Link
      className="text-foreground font-medium underline underline-offset-4"
      search={{ filters: [...UNSORTED_FILTER] }}
      to="/budget/transactions"
    >
      {m.home_categories_unsorted_review()}
    </Link>
  </p>
);

const TopCategoriesBody = ({ breakdown }: { breakdown: Breakdown }) => {
  const rows = topCategories(breakdown.categories, TOP_CATEGORIES_SHOWN);
  const unsortedMinor = unsortedSpendMinor(breakdown.categories);

  if (rows.length === 0 && unsortedMinor === 0) {
    return <WidgetEmpty>{m.home_categories_empty()}</WidgetEmpty>;
  }

  const percent = new Intl.NumberFormat(getLocale(), SHARE_FORMAT);

  return (
    <>
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <CategoryRow
              currency={breakdown.currency}
              key={row.category}
              percent={percent}
              row={row}
            />
          ))}
        </ul>
      ) : null}
      {unsortedMinor > 0 ? (
        <UnsortedNote
          amountMinor={unsortedMinor}
          currency={breakdown.currency}
        />
      ) : null}
    </>
  );
};

export const TopCategoriesCard = ({
  query,
}: {
  query: WidgetQuery<Breakdown>;
}) => (
  <WidgetCard
    action={
      <WidgetAction>
        <Link to="/budget/transactions">{m.nav_budget_transactions()}</Link>
      </WidgetAction>
    }
    title={m.home_categories_title()}
  >
    {query.isPending ? <TopCategoriesSkeleton /> : null}
    {query.isError ? (
      <WidgetError
        isRetrying={query.isRetrying}
        message={m.home_categories_error()}
        onRetry={query.handleRetry}
      />
    ) : null}
    {query.data ? <TopCategoriesBody breakdown={query.data} /> : null}
  </WidgetCard>
);

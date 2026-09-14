import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { Skeleton } from "@freenary/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@freenary/ui/components/table";
import { cn } from "@freenary/ui/lib/utils";
import { RiRepeatLine } from "@remixicon/react";

import { ConfidenceBadge } from "@/components/budget/recurrence-badge";
import { formatCurrency } from "@/lib/budget/format-currency";
import {
  frequencyLabel,
  relativeDayLabel,
  sectionEmptyLabel,
  sectionLabel,
} from "@/lib/budget/recurrence-labels";
import {
  annualCostMinor,
  dayDelta,
  merchantLabel,
  monthlyEquivalentMinor,
  UPCOMING_HORIZON_DAYS,
} from "@/lib/budget/recurring";
import type { RecurrenceKind, RecurringItem } from "@/lib/budget/recurring";
import { categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

/**
 * Seven columns do not fit a narrow panel, so each optional one waits for the
 * width it needs. Company, confidence, amount and next date always show.
 */
const FREQUENCY_COLUMN = "hidden @min-[40rem]/budget:table-cell";
const MONTHLY_COLUMN = "hidden @min-[52rem]/budget:table-cell";
/**
 * Yearly cost waits for the widest panel. 60rem, not 64: the app shell caps
 * its content at max-w-5xl, so the container's content box tops out just under
 * 62rem and a 64rem step would never fire.
 */
const WIDEST_COLUMN = "hidden @min-[60rem]/budget:table-cell";

const MONEY_CELL = "text-end font-mono tabular-nums";

const COLUMN_COUNT = 7;

/** Shared by a real row and its skeleton, so nothing shifts when data lands. */
const ROW_HEIGHT = "h-14";

const SKELETON_ROWS = 6;

/**
 * Above this the observed amounts differ enough that the median is a typical
 * amount rather than the amount, and printing it bare would overstate it.
 */
const AMOUNT_SPREAD_APPROX = 0.05;

const RecurringTableHead = () => (
  <TableHeader>
    <TableRow>
      <TableHead>{m.budget_recurring_column_merchant()}</TableHead>
      <TableHead>{m.budget_recurring_column_confidence()}</TableHead>
      <TableHead className="text-end">
        {m.budget_recurring_column_amount()}
      </TableHead>
      <TableHead className={FREQUENCY_COLUMN}>
        {m.budget_recurring_column_frequency()}
      </TableHead>
      <TableHead className="text-end">
        {m.budget_recurring_column_next()}
      </TableHead>
      <TableHead className={cn(MONTHLY_COLUMN, "text-end")}>
        {m.budget_recurring_column_monthly()}
      </TableHead>
      <TableHead className={cn(WIDEST_COLUMN, "text-end")}>
        {m.budget_recurring_column_annual()}
      </TableHead>
    </TableRow>
  </TableHeader>
);

const ItemRow = ({ asOf, item }: { asOf: Date; item: RecurringItem }) => {
  const amount = formatCurrency(item.typicalAmountMinor, item.currency);
  const next = new Date(item.nextExpected);
  const daysAway = dayDelta(asOf, next);
  // Inside the horizon the relative reading is the fast one; past it, "in 214
  // days" is noise the date already carries.
  const isSoon = daysAway >= 0 && daysAway <= UPCOMING_HORIZON_DAYS;

  return (
    <TableRow className={ROW_HEIGHT}>
      {/* The category rides under the company so it survives every breakpoint. */}
      <TableCell className="max-w-56">
        <span className="block truncate font-medium">
          {merchantLabel(item)}
        </span>
        <span className="text-muted-foreground block truncate">
          {categoryLabel(item.category)}
        </span>
      </TableCell>
      <TableCell>
        <ConfidenceBadge confidence={item.confidence} />
      </TableCell>
      <TableCell className={MONEY_CELL}>
        {item.amountSpread > AMOUNT_SPREAD_APPROX
          ? m.budget_recurring_amount_approx({ amount })
          : amount}
      </TableCell>
      <TableCell className={FREQUENCY_COLUMN}>
        {frequencyLabel(item.frequency)}
      </TableCell>
      <TableCell className={MONEY_CELL}>
        <span className="block">
          {next.toLocaleDateString(getLocale(), {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        {isSoon && (
          <span className="text-muted-foreground block font-sans">
            {relativeDayLabel(daysAway)}
          </span>
        )}
      </TableCell>
      <TableCell className={cn(MONTHLY_COLUMN, MONEY_CELL)}>
        {formatCurrency(monthlyEquivalentMinor(item), item.currency)}
      </TableCell>
      <TableCell className={cn(WIDEST_COLUMN, MONEY_CELL)}>
        {formatCurrency(annualCostMinor(item), item.currency)}
      </TableCell>
    </TableRow>
  );
};

const SkeletonRows = () => (
  <TableBody>
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <TableRow className={ROW_HEIGHT} key={index}>
        <TableCell aria-hidden="true" colSpan={COLUMN_COUNT}>
          <Skeleton className="h-8 w-full" />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
);

interface RecurringTableProps {
  asOf: Date;
  /** Whether a filter, rather than the detection, is why a row is missing. */
  hasFilters: boolean;
  isError: boolean;
  isPending: boolean;
  items: RecurringItem[];
  kind: RecurrenceKind;
}

/**
 * One kind of recurrence, one run of rows. The kind is the reader's own choice
 * above the table, so a predicted habit never sits among confirmed direct
 * debits and no row has to carry the word that tells them apart.
 */
export const RecurringTable = ({
  asOf,
  hasFilters,
  isError,
  isPending,
  items,
  kind,
}: RecurringTableProps) => {
  if (isError) {
    // A failed request never borrows an empty state: "no commitment detected"
    // is a claim the response never made.
    return (
      <p className="text-muted-foreground px-4 py-8 text-center">
        {m.budget_recurring_unavailable()}
      </p>
    );
  }

  if (!isPending && items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiRepeatLine />
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters
              ? m.budget_recurring_no_match_title()
              : sectionLabel(kind)}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? m.budget_recurring_no_match_body()
              : sectionEmptyLabel(kind)}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div aria-busy={isPending}>
      {isPending && (
        <output className="sr-only">{m.budget_recurring_loading()}</output>
      )}
      <Table aria-label={m.budget_recurring_table_label()}>
        <RecurringTableHead />
        {isPending ? (
          <SkeletonRows />
        ) : (
          <TableBody>
            {items.map((item) => (
              <ItemRow asOf={asOf} item={item} key={item.merchantKey} />
            ))}
          </TableBody>
        )}
      </Table>
    </div>
  );
};

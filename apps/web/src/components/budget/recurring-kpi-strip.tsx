import { Skeleton } from "@freenary/ui/components/skeleton";
import { cn } from "@freenary/ui/lib/utils";

import { formatCurrency } from "@/lib/budget/format-currency";
import type { RecurringSummary } from "@/lib/budget/recurring";
import { UPCOMING_HORIZON_DAYS } from "@/lib/budget/recurring";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

// The app shell caps its content at max-w-5xl, so the `@container/budget`
// content box never passes 62rem: six across is unreachable, and two rows of
// three is the widest honest step.
const STRIP_LAYOUT = "grid grid-cols-2 gap-4 @min-[30rem]/budget:grid-cols-3";

/**
 * Matches a cell's own height so the strip does not resize when data lands.
 * Tall enough for the second line the commitments cell may carry.
 */
const CELL_HEIGHT = "h-18";

/** One per cell, so the pending strip has the same shape as the loaded one. */
const CELL_KEYS = [
  "monthly",
  "annual",
  "share",
  "remaining",
  "active",
  "due",
] as const;

/** Zero is neither a warning nor a win, so it stays untinted. */
const remainingTone = (remainingMinor: number): string | undefined => {
  if (remainingMinor < 0) {
    return "text-destructive";
  }
  return remainingMinor > 0 ? "text-success" : undefined;
};

/** A figure the tab did not measure prints a dash; a zero would invent one. */
const KpiCell = ({
  label,
  note,
  tone,
  value,
}: {
  label: string;
  note?: string;
  tone?: string;
  value: string | null;
}) => (
  <div className={cn("flex flex-col gap-1", CELL_HEIGHT)}>
    {value === null ? (
      <span className="text-muted-foreground text-xl font-semibold">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{m.budget_summary_unavailable()}</span>
      </span>
    ) : (
      <span className={cn("text-xl font-semibold tabular-nums", tone)}>
        {value}
      </span>
    )}
    <span className="text-muted-foreground text-sm">{label}</span>
    {note ? (
      <span className="text-muted-foreground text-xs">{note}</span>
    ) : null}
  </div>
);

interface RecurringKpiStripProps {
  currency: string;
  isError: boolean;
  isPending: boolean;
  summary: RecurringSummary | undefined;
}

/** The Recurring tab's headline figures, above every chart that details them. */
export const RecurringKpiStrip = ({
  currency,
  isError,
  isPending,
  summary,
}: RecurringKpiStripProps) => {
  if (isPending) {
    return (
      <div aria-busy="true" className={STRIP_LAYOUT}>
        <output className="sr-only">{m.budget_recurring_loading()}</output>
        {CELL_KEYS.map((key) => (
          <Skeleton aria-hidden="true" className={CELL_HEIGHT} key={key} />
        ))}
      </div>
    );
  }

  const figures = isError ? undefined : summary;
  // A share of nothing is not zero: with no plan and no observed income the
  // denominator is missing, and both cells must say so rather than print 0.
  const share = figures?.share ?? null;
  const remainingMinor = figures?.remainingMinor ?? null;
  const locale = getLocale();
  const countFormat = new Intl.NumberFormat(locale);
  const percentFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: "percent",
  });

  return (
    <div className={STRIP_LAYOUT}>
      <KpiCell
        label={m.budget_recurring_kpi_monthly()}
        value={figures ? formatCurrency(figures.monthlyMinor, currency) : null}
      />
      <KpiCell
        label={m.budget_recurring_kpi_annual()}
        value={figures ? formatCurrency(figures.annualMinor, currency) : null}
      />
      <KpiCell
        label={
          figures?.denominatorKind === "plan"
            ? m.budget_recurring_kpi_share_plan()
            : m.budget_recurring_kpi_share_income()
        }
        value={share === null ? null : percentFormat.format(share)}
      />
      <KpiCell
        label={m.budget_recurring_kpi_remaining()}
        tone={
          remainingMinor === null ? undefined : remainingTone(remainingMinor)
        }
        value={
          remainingMinor === null
            ? null
            : formatCurrency(remainingMinor, currency)
        }
      />
      <KpiCell
        label={m.budget_recurring_kpi_active()}
        note={
          figures && figures.behavioralCount > 0
            ? m.budget_recurring_kpi_patterns_note({
                count: figures.behavioralCount,
              })
            : undefined
        }
        value={figures ? countFormat.format(figures.activeCount) : null}
      />
      <KpiCell
        label={m.budget_recurring_kpi_due({ days: UPCOMING_HORIZON_DAYS })}
        // The count alone leaves "how much lands" to arithmetic over the list.
        note={
          figures && figures.upcomingCount > 0
            ? m.budget_recurring_upcoming_total({
                amount: formatCurrency(figures.upcomingMinor, currency),
              })
            : undefined
        }
        value={figures ? countFormat.format(figures.upcomingCount) : null}
      />
    </div>
  );
};

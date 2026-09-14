import { formatCurrency } from "@/lib/budget/format-currency";
import type { FrequencyRow } from "@/lib/budget/recurring";
import { CHART_COLOR_VARS } from "@/lib/chart-colors";
import { m } from "@/paraglide/messages.js";

interface PurchaseFrequencyChartProps {
  currency: string;
  rows: FrequencyRow[];
}

/**
 * The companies a reader deals with most often. Bars measure observed
 * occurrences; the two hues are the two kinds, as everywhere else on this tab.
 */
export const PurchaseFrequencyChart = ({
  currency,
  rows,
}: PurchaseFrequencyChartProps) => {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
        {m.budget_recurring_frequency_empty()}
      </p>
    );
  }

  // A row with no observed occurrence would divide the bar width by nothing.
  const scale = Math.max(1, ...rows.map((row) => row.occurrences));

  return (
    <ul
      aria-label={m.budget_recurring_frequency_chart_label()}
      className="flex h-full flex-col gap-2 overflow-y-auto"
    >
      {rows.map((row) => (
        <li className="flex flex-col gap-1.5 p-1" key={row.id}>
          <span className="flex items-baseline gap-2 text-xs">
            <span className="truncate">{row.label}</span>
            <span className="text-muted-foreground shrink-0 text-[10px]">
              {m.budget_recurring_per_year({
                count: Math.round(row.perYear),
              })}
            </span>
            <span className="ms-auto shrink-0 font-mono text-[11px] tabular-nums">
              {formatCurrency(row.annualMinor, currency)}
            </span>
          </span>
          <span className="bg-muted relative block h-2 w-full overflow-hidden rounded-full">
            <span
              className="absolute inset-y-0 start-0 rounded-full"
              style={{
                backgroundColor:
                  row.kind === "fixed"
                    ? CHART_COLOR_VARS.blue
                    : CHART_COLOR_VARS.orange,
                width: `${(row.occurrences / scale) * 100}%`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
};

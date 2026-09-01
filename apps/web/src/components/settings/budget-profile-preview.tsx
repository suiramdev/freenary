import type { CategoryEntry } from "@freenary/api/lib/categories";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@freenary/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { ChartDonutIcon } from "@phosphor-icons/react";
import { useMemo } from "react";

import { BudgetProfileSummary } from "@/components/settings/budget-profile-summary";
import { SankeyChart } from "@/components/shared/sankey-chart";
import { amountOf } from "@/hooks/settings/use-budget-profile-editor";
import type { EditorLine } from "@/hooks/settings/use-budget-profile-editor";
import { useDebouncedValue } from "@/hooks/shared/use-debounced-value";
import { formatCurrency } from "@/lib/budget/format-currency";
import { toBudgetProfileSankey } from "@/lib/settings/budget-profile-sankey";
import type { BudgetProfileLine } from "@/lib/settings/budget-profile-sankey";
import { categoryEntryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";

/** Repainting the dithered canvas is per-pixel work, so typing settles first. */
const PREVIEW_DELAY_MS = 200;

/**
 * A getter, not a constant: resolving the label here would pin the locale.
 * `isCustom` marks the label as already-translated copy, so `categoryEntryLabel`
 * leaves it alone rather than reading `other` as the taxonomy group.
 */
const fallbackGroupOf = (): Pick<
  CategoryEntry,
  "color" | "isCustom" | "key" | "label"
> => ({
  color: "grey",
  isCustom: true,
  key: "other",
  label: m.settings_category_other(),
});

interface BudgetProfilePreviewProps {
  categories: CategoryEntry[];
  isPending: boolean;
  lines: EditorLine[];
}

export const BudgetProfilePreview = ({
  categories,
  isPending,
  lines,
}: BudgetProfilePreviewProps) => {
  // Debouncing the pending flag alongside the lines keeps the trailing empty
  // draft from reading as "no budget" for one debounce window after load.
  const debouncedLines = useDebouncedValue(
    isPending ? null : lines,
    PREVIEW_DELAY_MS
  );

  const profileLines = useMemo<BudgetProfileLine[]>(() => {
    const entryByKey = new Map(
      categories.map((entry) => [entry.key, entry] as const)
    );

    // A line names a category; the chart's middle column is its group. A
    // top-level custom category is its own group, so it stands in for itself.
    const groupOf = (categoryKey: string) => {
      const entry = entryByKey.get(categoryKey);
      if (!entry) {
        return fallbackGroupOf();
      }
      const parent = entry.parentKey
        ? entryByKey.get(entry.parentKey)
        : undefined;
      return parent ?? entry;
    };

    return (debouncedLines ?? []).map((line) => {
      const group = groupOf(line.categoryKey);
      const amount = amountOf(line.amountInput);

      return {
        amount: Number.isNaN(amount) ? 0 : amount,
        groupColor: group.color,
        groupKey: group.key,
        groupLabel: categoryEntryLabel(group),
        id: line.id,
        kind: line.kind,
        label: line.label.trim() || m.settings_line_untitled(),
      };
    });
  }, [categories, debouncedLines]);

  const flow = useMemo(
    () => toBudgetProfileSankey(profileLines),
    [profileLines]
  );

  const totals = useMemo(() => {
    let totalAllocated = 0;
    let totalRevenue = 0;
    for (const line of profileLines) {
      if (line.kind === "REVENUE") {
        totalRevenue += line.amount;
      } else {
        totalAllocated += line.amount;
      }
    }
    return { totalAllocated, totalRevenue };
  }, [profileLines]);

  if (debouncedLines === null) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle>{m.settings_budget_flow_title()}</CardTitle>
        </CardHeader>
        <CardContent>
          <output className="sr-only">
            {m.settings_budget_flow_loading()}
          </output>
          <Skeleton aria-hidden="true" className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (profileLines.length === 0) {
    return (
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartDonutIcon />
              </EmptyMedia>
              <EmptyTitle>{m.settings_budget_empty_title()}</EmptyTitle>
              <EmptyDescription>
                {m.settings_budget_empty_description()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.settings_budget_flow_title()}</CardTitle>
      </CardHeader>
      <CardContent>
        <SankeyChart
          columns={flow.columns}
          formatValue={formatCurrency}
          label={m.settings_budget_flow_chart_label()}
          links={flow.links}
        />
        <BudgetProfileSummary
          totalAllocated={totals.totalAllocated}
          totalRevenue={totals.totalRevenue}
        />
      </CardContent>
    </Card>
  );
};

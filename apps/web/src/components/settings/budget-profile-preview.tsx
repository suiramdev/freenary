import { budgetLineKindOfGroup } from "@freenary/api/lib/budget-profile";
import type { CategoryEntry } from "@freenary/api/lib/categories";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@freenary/ui/components/empty";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { RiDonutChartLine } from "@remixicon/react";
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

interface BudgetProfilePreviewProps {
  categories: CategoryEntry[];
  isPending: boolean;
  lines: EditorLine[];
}

const TYPING_SETTLE_DELAY_MS = 200;

const NOT_LOADED_YET = null;

const LABEL_IS_ALREADY_TRANSLATED_COPY = true;

const uncategorisedGroupInCurrentLocale = (): Pick<
  CategoryEntry,
  "color" | "isCustom" | "key" | "label"
> => ({
  color: "grey",
  isCustom: LABEL_IS_ALREADY_TRANSLATED_COPY,
  key: "other",
  label: m.settings_category_other(),
});

export const BudgetProfilePreview = ({
  categories,
  isPending,
  lines,
}: BudgetProfilePreviewProps) => {
  const debouncedLines = useDebouncedValue(
    isPending ? NOT_LOADED_YET : lines,
    TYPING_SETTLE_DELAY_MS
  );

  const profileLines = useMemo<BudgetProfileLine[]>(() => {
    const entryByKey = new Map(
      categories.map((entry) => [entry.key, entry] as const)
    );

    const chartColumnGroupOf = (entry: CategoryEntry | undefined) => {
      if (!entry) {
        return uncategorisedGroupInCurrentLocale();
      }

      const parent = entry.parentKey
        ? entryByKey.get(entry.parentKey)
        : undefined;

      return parent ?? entry;
    };

    return (debouncedLines ?? []).map((line) => {
      const entry = entryByKey.get(line.categoryKey);
      const group = chartColumnGroupOf(entry);
      const amount = amountOf(line.amountInput);
      const categoryLabel = entry ? categoryEntryLabel(entry) : "";

      return {
        amount: Number.isNaN(amount) ? 0 : amount,
        groupColor: group.color,
        groupKey: group.key,
        groupLabel: categoryEntryLabel(group),
        id: line.id,
        kind: budgetLineKindOfGroup(group.key),
        label: line.label.trim() || categoryLabel || m.settings_line_untitled(),
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

  if (debouncedLines === NOT_LOADED_YET) {
    return (
      <div aria-busy="true">
        <output className="sr-only">{m.settings_budget_flow_loading()}</output>
        <Skeleton aria-hidden="true" className="h-[200px]" />
      </div>
    );
  }

  if (profileLines.length === 0) {
    return (
      <Empty className="bg-muted/40 rounded-md border p-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiDonutChartLine />
          </EmptyMedia>
          <EmptyTitle>{m.settings_budget_empty_title()}</EmptyTitle>
          <EmptyDescription>
            {m.settings_budget_empty_description()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col">
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
    </div>
  );
};

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

/** Repainting the dithered canvas is per-pixel work, so typing settles first. */
const PREVIEW_DELAY_MS = 200;

const FALLBACK_ENTRY: Pick<CategoryEntry, "color" | "label"> = {
  color: "grey",
  label: "Other",
};

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

    return (debouncedLines ?? []).map((line) => {
      const entry = entryByKey.get(line.categoryKey) ?? FALLBACK_ENTRY;
      const amount = amountOf(line.amountInput);

      return {
        amount: Number.isNaN(amount) ? 0 : amount,
        categoryColor: entry.color,
        categoryKey: line.categoryKey,
        categoryLabel: entry.label,
        id: line.id,
        kind: line.kind,
        label: line.label.trim() || "Untitled",
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
          <CardTitle>Budget Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <output className="sr-only">Loading budget flow</output>
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
              <EmptyTitle>No budget yet</EmptyTitle>
              <EmptyDescription>
                Add a revenue below and the flow appears here as you type.
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
        <CardTitle>Budget Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <SankeyChart
          columns={flow.columns}
          emphasizedId={flow.emphasizedId}
          formatValue={formatCurrency}
          label="Budgeting profile from revenues through the budget to each planned line"
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

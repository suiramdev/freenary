import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Button } from "@freenary/ui/components/button";
import { Separator } from "@freenary/ui/components/separator";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { RiAddLine } from "@remixicon/react";
import { Reorder } from "motion/react";
import { useState } from "react";

import { BudgetLineRow } from "@/components/settings/budget-line-row";
import { BudgetProfilePreview } from "@/components/settings/budget-profile-preview";
import { CustomCategoryDrawer } from "@/components/settings/custom-category-drawer";
import { SettingsSection } from "@/components/settings/settings-section";
import type { EditorLine } from "@/hooks/settings/use-budget-profile-editor";
import { useScrollToAnchor } from "@/hooks/shared/use-scroll-to-anchor";
import { BUDGETING_ANCHOR } from "@/lib/settings/anchors";
import { m } from "@/paraglide/messages.js";

interface BudgetingSectionProps {
  addLine: () => void;
  categories: CategoryEntry[];
  errors: Map<string, string>;
  isPending: boolean;
  lines: EditorLine[];
  moveLine: (id: string, direction: "down" | "up") => void;
  removeLine: (id: string) => void;
  reorderLines: (lines: EditorLine[]) => void;
  updateLine: (id: string, patch: Partial<EditorLine>) => void;
}

/**
 * One flat list of lines. The category a line carries is what places it in the
 * flow, so splitting the form into revenue/investment/outgoing sections would
 * only ask the same question twice.
 */
export const BudgetingSection = ({
  addLine,
  categories,
  errors,
  isPending,
  lines,
  moveLine,
  removeLine,
  reorderLines,
  updateLine,
}: BudgetingSectionProps) => {
  const sectionRef = useScrollToAnchor<HTMLDivElement>(
    BUDGETING_ANCHOR,
    !isPending
  );
  // The row that asked for a new category, so the created one lands back on it.
  const [creatingForLineId, setCreatingForLineId] = useState<string | null>(
    null
  );

  return (
    <div id={BUDGETING_ANCHOR} ref={sectionRef}>
      <SettingsSection
        description={m.settings_budgeting_description()}
        title={m.settings_budgeting_title()}
      >
        <BudgetProfilePreview
          categories={categories}
          isPending={isPending}
          lines={lines}
        />

        <Separator />

        {isPending ? (
          <div aria-busy="true">
            <output className="sr-only">
              {m.settings_budgeting_loading()}
            </output>
            <Skeleton aria-hidden="true" className="h-[120px]" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lines.length > 0 ? (
              <Reorder.Group
                as="div"
                axis="y"
                className="flex flex-col gap-2"
                onReorder={reorderLines}
                values={lines}
              >
                {lines.map((line) => (
                  <BudgetLineRow
                    categories={categories}
                    error={errors.get(line.id)}
                    key={line.id}
                    line={line}
                    onCreateCategory={setCreatingForLineId}
                    onMove={moveLine}
                    onRemove={removeLine}
                    onUpdate={updateLine}
                  />
                ))}
              </Reorder.Group>
            ) : null}

            {/* Outline, not ghost: this is the section's primary action and it
                carries the same weight as Categories' "New category". */}
            <Button className="self-start" onClick={addLine} variant="outline">
              <RiAddLine data-icon="inline-start" />
              {m.settings_budgeting_add_line()}
            </Button>
          </div>
        )}

        <CustomCategoryDrawer
          edited={null}
          onCreated={(key) => {
            if (creatingForLineId) {
              updateLine(creatingForLineId, { categoryKey: key });
            }
          }}
          onOpenChange={(open) => {
            if (!open) {
              setCreatingForLineId(null);
            }
          }}
          open={creatingForLineId !== null}
        />
      </SettingsSection>
    </div>
  );
};

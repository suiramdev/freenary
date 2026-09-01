import type { CategoryEntry } from "@freenary/api/lib/categories";
import { Skeleton } from "@freenary/ui/components/skeleton";
import { useState } from "react";

import { BudgetLineGroup } from "@/components/settings/budget-line-group";
import { CustomCategoryDrawer } from "@/components/settings/custom-category-drawer";
import { SettingsSection } from "@/components/settings/settings-section";
import type { EditorLine } from "@/hooks/settings/use-budget-profile-editor";
import type { BudgetLineKind } from "@/lib/settings/budget-profile-sankey";
import { m } from "@/paraglide/messages.js";

/**
 * Message getters rather than strings: resolving them here would pin the
 * locale of whichever request loaded the module first.
 */
interface GroupDefinition {
  addLabel: () => string;
  description: () => string;
  kind: BudgetLineKind;
  title: () => string;
}

/** Ordered to walk the user through revenues → investments → outgoings. */
const GROUPS: GroupDefinition[] = [
  {
    addLabel: m.settings_budgeting_add_revenue,
    description: m.settings_budgeting_revenues_description,
    kind: "REVENUE",
    title: m.settings_budgeting_revenues_title,
  },
  {
    addLabel: m.settings_budgeting_add_investment,
    description: m.settings_budgeting_investments_description,
    kind: "INVESTMENT",
    title: m.settings_budgeting_investments_title,
  },
  {
    addLabel: m.settings_budgeting_add_outgoing,
    description: m.settings_budgeting_outgoings_description,
    kind: "OUTGOING",
    title: m.settings_budgeting_outgoings_title,
  },
];

interface BudgetingSectionProps {
  addLine: (kind: BudgetLineKind) => void;
  categories: CategoryEntry[];
  errors: Map<string, string>;
  isPending: boolean;
  lines: EditorLine[];
  removeLine: (id: string) => void;
  updateLine: (id: string, patch: Partial<EditorLine>) => void;
}

export const BudgetingSection = ({
  addLine,
  categories,
  errors,
  isPending,
  lines,
  removeLine,
  updateLine,
}: BudgetingSectionProps) => {
  // The row that asked for a new category, so the created one lands back on it.
  const [creatingForLineId, setCreatingForLineId] = useState<string | null>(
    null
  );

  return (
    <SettingsSection
      description={m.settings_budgeting_description()}
      title={m.settings_budgeting_title()}
    >
      {isPending ? (
        <div aria-busy="true">
          <output className="sr-only">{m.settings_budgeting_loading()}</output>
          <Skeleton aria-hidden="true" className="h-[120px]" />
        </div>
      ) : (
        GROUPS.map((group, index) => {
          const groupLines = lines.filter((line) => line.kind === group.kind);
          return (
            <BudgetLineGroup
              addLabel={group.addLabel()}
              categories={categories}
              defaultOpen={groupLines.length > 0 || index === 0}
              description={group.description()}
              errors={errors}
              key={group.kind}
              kind={group.kind}
              lines={groupLines}
              onAdd={addLine}
              onCreateCategory={setCreatingForLineId}
              onRemove={removeLine}
              onUpdate={updateLine}
              step={index + 1}
              title={group.title()}
            />
          );
        })
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
  );
};

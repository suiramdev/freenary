import type { CategoryEntry } from "@freenary/api/lib/categories";
import { useState } from "react";

import { BudgetLineGroup } from "@/components/settings/budget-line-group";
import { CustomCategorySheet } from "@/components/settings/custom-category-sheet";
import { SettingsSection } from "@/components/settings/settings-section";
import type { EditorLine } from "@/hooks/settings/use-budget-profile-editor";
import type { BudgetLineKind } from "@/lib/settings/budget-profile-sankey";

interface GroupDefinition {
  addLabel: string;
  description: string;
  kind: BudgetLineKind;
  title: string;
}

/** Ordered to walk the user through revenues → investments → outgoings. */
const GROUPS: GroupDefinition[] = [
  {
    addLabel: "Add revenue",
    description:
      "Everything that comes in each month, before anything is spent.",
    kind: "REVENUE",
    title: "Revenues",
  },
  {
    addLabel: "Add investment",
    description: "What you set aside first — savings, stocks, life insurance.",
    kind: "INVESTMENT",
    title: "Investments",
  },
  {
    addLabel: "Add outgoing",
    description:
      "Recurring costs of living: housing, groceries, subscriptions.",
    kind: "OUTGOING",
    title: "Outgoings",
  },
];

interface BudgetingSectionProps {
  addLine: (kind: BudgetLineKind) => void;
  categories: CategoryEntry[];
  errors: Map<string, string>;
  lines: EditorLine[];
  removeLine: (id: string) => void;
  updateLine: (id: string, patch: Partial<EditorLine>) => void;
}

export const BudgetingSection = ({
  addLine,
  categories,
  errors,
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
      description="Declare where your money comes from and where it goes each month. The flow updates as you type."
      title="Budgeting profile"
    >
      {GROUPS.map((group, index) => {
        const groupLines = lines.filter((line) => line.kind === group.kind);
        return (
          <BudgetLineGroup
            addLabel={group.addLabel}
            categories={categories}
            defaultOpen={groupLines.length > 0 || index === 0}
            description={group.description}
            errors={errors}
            key={group.kind}
            kind={group.kind}
            lines={groupLines}
            onAdd={addLine}
            onCreateCategory={setCreatingForLineId}
            onRemove={removeLine}
            onUpdate={updateLine}
            step={index + 1}
            title={group.title}
          />
        );
      })}

      <CustomCategorySheet
        edited={null}
        key={creatingForLineId ?? "closed"}
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

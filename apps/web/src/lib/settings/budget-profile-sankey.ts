import type { DitherColor } from "@/components/dither-kit/palette";
import type { SankeyFlow, SankeyLink, SankeyNode } from "@/lib/sankey/layout";

export type BudgetLineKind = "INVESTMENT" | "OUTGOING" | "REVENUE";

export interface BudgetProfileLine {
  /** Planned amount per month in minor units. */
  amount: number;
  categoryColor: DitherColor;
  categoryKey: string;
  categoryLabel: string;
  id: string;
  kind: BudgetLineKind;
  label: string;
}

const BUDGET_ID = "budget";
const UNALLOCATED_ID = "unallocated";

interface CategoryGroup {
  color: DitherColor;
  label: string;
  lines: BudgetProfileLine[];
  value: number;
}

/**
 * Maps a budgeting profile onto revenues → budget → category → line.
 * Investments are grouped ahead of outgoings so the allocation side reads
 * in the order the profile is entered.
 */
export const toBudgetProfileSankey = (
  lines: BudgetProfileLine[]
): SankeyFlow => {
  const revenues = lines.filter((line) => line.kind === "REVENUE");
  const allocations = [
    ...lines.filter((line) => line.kind === "INVESTMENT"),
    ...lines.filter((line) => line.kind === "OUTGOING"),
  ];

  const totalRevenue = revenues.reduce((total, line) => total + line.amount, 0);
  const totalAllocated = allocations.reduce(
    (total, line) => total + line.amount,
    0
  );

  // Insertion order is the column order, so a group sits where its first line appeared.
  const groups = new Map<string, CategoryGroup>();
  for (const line of allocations) {
    const group = groups.get(line.categoryKey);
    if (group) {
      group.lines.push(line);
      group.value += line.amount;
    } else {
      groups.set(line.categoryKey, {
        color: line.categoryColor,
        label: line.categoryLabel,
        lines: [line],
        value: line.amount,
      });
    }
  }

  const groupNodes: SankeyNode[] = [];
  const lineNodes: SankeyNode[] = [];
  const links: SankeyLink[] = revenues.map((line) => ({
    source: `revenue:${line.id}`,
    target: BUDGET_ID,
    value: line.amount,
  }));

  for (const [categoryKey, group] of groups) {
    const groupId = `group:${categoryKey}`;
    groupNodes.push({
      color: group.color,
      id: groupId,
      label: group.label,
      value: group.value,
    });
    links.push({ source: BUDGET_ID, target: groupId, value: group.value });

    // Emitting a group's lines right after the group keeps ribbons from crossing.
    for (const line of group.lines) {
      const lineId = `line:${line.id}`;
      lineNodes.push({
        color: line.categoryColor,
        id: lineId,
        label: line.label,
        value: line.amount,
      });
      links.push({ source: groupId, target: lineId, value: line.amount });
    }
  }

  const unallocated = totalRevenue - totalAllocated;
  if (unallocated > 0) {
    groupNodes.push({
      color: "grey",
      id: UNALLOCATED_ID,
      label: "Unallocated",
      value: unallocated,
    });
    links.push({
      source: BUDGET_ID,
      target: UNALLOCATED_ID,
      value: unallocated,
    });
  }

  return {
    columns: [
      revenues.map((line) => ({
        color: line.categoryColor,
        id: `revenue:${line.id}`,
        label: line.label,
        value: line.amount,
      })),
      [
        {
          color: "blue",
          id: BUDGET_ID,
          label: "Budget",
          // Over-allocating pushes more through the hub than comes in; sizing it by
          // the larger side keeps the outgoing ribbons anchored to the node.
          value: Math.max(totalRevenue, totalAllocated),
        },
      ],
      groupNodes,
      lineNodes,
    ],
    emphasizedId: BUDGET_ID,
    links,
  };
};

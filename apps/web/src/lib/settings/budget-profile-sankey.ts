import type { BudgetLineKind } from "@freenary/api/lib/budget-profile";
import type { CategoryColor } from "@freenary/api/lib/taxonomy";

import { apportion } from "@/lib/sankey/apportion";
import type { SankeyFlow, SankeyLink, SankeyNode } from "@/lib/sankey/layout";
import { m } from "@/paraglide/messages.js";

export interface BudgetProfileLine {
  /** Planned amount per month in minor units. */
  amount: number;
  groupColor: CategoryColor;
  /** Group slug, or the custom category's key when it is a group of its own. */
  groupKey: string;
  groupLabel: string;
  id: string;
  kind: BudgetLineKind;
  label: string;
}

const MONEY_LEFT_ID = "money-left";

interface LineGroup {
  color: CategoryColor;
  label: string;
  lines: BudgetProfileLine[];
  value: number;
}

/**
 * Maps a budgeting profile onto the three levels of the hierarchy:
 * revenues → category group → line.
 *
 * Grouping by group rather than by category is what makes this chart read the
 * same as the cash-flow one. Investments are grouped ahead of outgoings so the
 * allocation side follows the order the profile is entered.
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
  const groups = new Map<string, LineGroup>();
  for (const line of allocations) {
    const group = groups.get(line.groupKey);
    if (group) {
      group.lines.push(line);
      group.value += line.amount;
    } else {
      groups.set(line.groupKey, {
        color: line.groupColor,
        label: line.groupLabel,
        lines: [line],
        value: line.amount,
      });
    }
  }

  const groupNodes: SankeyNode[] = [];
  const lineNodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  for (const [groupKey, group] of groups) {
    const groupId = `group:${groupKey}`;
    groupNodes.push({
      color: group.color,
      id: groupId,
      label: group.label,
      value: group.value,
    });

    // Emitting a group's lines right after the group keeps ribbons from crossing.
    for (const line of group.lines) {
      const lineId = `line:${line.id}`;
      lineNodes.push({
        color: group.color,
        id: lineId,
        label: line.label,
        value: line.amount,
      });
      links.push({ source: groupId, target: lineId, value: line.amount });
    }
  }

  const moneyLeft = totalRevenue - totalAllocated;
  if (moneyLeft > 0) {
    groupNodes.push({
      color: "grey",
      id: MONEY_LEFT_ID,
      label: m.settings_budget_money_left(),
      value: moneyLeft,
    });
  }

  const sources = revenues.map((line) => ({
    id: `revenue:${line.id}`,
    value: line.amount,
  }));

  return {
    columns: [
      revenues.map((line) => ({
        color: line.groupColor,
        id: `revenue:${line.id}`,
        label: line.label,
        value: line.amount,
      })),
      groupNodes,
      lineNodes,
    ],
    links: [...apportion(sources, groupNodes), ...links],
  };
};

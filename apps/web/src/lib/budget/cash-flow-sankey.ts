import {
  CATEGORY_GROUP_COLORS,
  categoryColor,
  isCategoryGroup,
  isSpendingCategory,
} from "@freenary/api/lib/taxonomy";
import type {
  CategoryGroup,
  SpendingCategory,
} from "@freenary/api/lib/taxonomy";

import type { DitherColor } from "@/components/dither-kit/palette";
import type { CategorySelection } from "@/lib/budget/category-selection";
import { apportion } from "@/lib/sankey/apportion";
import type { SankeyFlow, SankeyLink, SankeyNode } from "@/lib/sankey/layout";

export interface IncomeSource {
  name: string;
  value: number;
}

export interface ExpenseCategory {
  category: SpendingCategory;
  label: string;
  value: number;
}

export interface ExpenseGroup {
  categories: ExpenseCategory[];
  group: CategoryGroup;
  label: string;
  value: number;
}

export interface CashFlowData {
  groups: ExpenseGroup[];
  incomeNodes: IncomeSource[];
  /** Income the period did not spend; drawn as a group with no categories. */
  moneyLeft: number;
  totalIncome: number;
}

const GROUP_PREFIX = "group:";
const CATEGORY_PREFIX = "category:";
const MONEY_LEFT_ID = `${GROUP_PREFIX}money-left`;

const SALARY = /salary|lön|wage|payroll/u;
const DIVIDEND = /dividend|divi/u;
const INTEREST = /interest|ränta/u;
const REFUND = /refund|return/u;

/** An income source is a counterparty name, not a category, so read its colour off the name. */
const incomeColor = (name: string): DitherColor => {
  const lower = name.toLowerCase();
  if (DIVIDEND.test(lower)) {
    return "purple";
  }
  if (INTEREST.test(lower)) {
    return "blue";
  }
  if (REFUND.test(lower)) {
    return "orange";
  }
  if (SALARY.test(lower)) {
    return "green";
  }
  return "green";
};

const incomeNodeId = (name: string) => `income:${name}`;
const groupNodeId = (group: CategoryGroup) => `${GROUP_PREFIX}${group}`;
const categoryNodeId = (category: SpendingCategory) =>
  `${CATEGORY_PREFIX}${category}`;

/**
 * Reads a clicked node back into a selection. Ids carry the slug, so this never
 * matches on labels — two categories may share one once custom ones are in play.
 */
export const selectionOfNodeId = (nodeId: string): CategorySelection | null => {
  if (nodeId.startsWith(GROUP_PREFIX)) {
    const group = nodeId.slice(GROUP_PREFIX.length);
    return isCategoryGroup(group) ? { group, kind: "group" } : null;
  }
  if (nodeId.startsWith(CATEGORY_PREFIX)) {
    const category = nodeId.slice(CATEGORY_PREFIX.length);
    return isSpendingCategory(category) ? { category, kind: "category" } : null;
  }
  return null;
};

/**
 * Maps a period's cash flow onto the three levels of the hierarchy:
 * income sources → category group → category.
 */
export const toCashFlowSankey = ({
  groups,
  incomeNodes,
  moneyLeft,
}: CashFlowData): SankeyFlow => {
  const links: SankeyLink[] = [];

  const groupNodes: SankeyNode[] = [];
  const categoryNodes: SankeyNode[] = [];

  for (const group of groups) {
    const id = groupNodeId(group.group);
    groupNodes.push({
      color: CATEGORY_GROUP_COLORS[group.group],
      id,
      label: group.label,
      value: group.value,
    });

    // Emitting a group's categories right after the group keeps ribbons from crossing.
    for (const category of group.categories) {
      categoryNodes.push({
        color: categoryColor(category.category),
        id: categoryNodeId(category.category),
        label: category.label,
        value: category.value,
      });
      links.push({
        source: id,
        target: categoryNodeId(category.category),
        value: category.value,
      });
    }
  }

  if (moneyLeft > 0) {
    groupNodes.push({
      color: "grey",
      id: MONEY_LEFT_ID,
      label: "Money left",
      value: moneyLeft,
    });
  }

  const sources = incomeNodes.map((node) => ({
    id: incomeNodeId(node.name),
    value: node.value,
  }));

  return {
    columns: [
      incomeNodes.map((node) => ({
        color: incomeColor(node.name),
        id: incomeNodeId(node.name),
        label: node.name,
        value: node.value,
      })),
      groupNodes,
      categoryNodes,
    ],
    links: [...apportion(sources, groupNodes), ...links],
  };
};

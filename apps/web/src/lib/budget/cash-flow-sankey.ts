import { CATEGORY_COLORS } from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";

import type { DitherColor } from "@/components/dither-kit/palette";
import type { SankeyFlow, SankeyLink } from "@/lib/sankey/layout";

export interface IncomeSource {
  name: string;
  value: number;
}

export interface ExpenseCategory {
  category: SpendingCategory;
  label: string;
  value: number;
}

/** `getSankeyData` addresses nodes by label, so both sides come in by name. */
export interface CashFlowLink {
  source: string;
  target: string;
  value: number;
}

export interface CashFlowData {
  expenseLinks: CashFlowLink[];
  expenseNodes: ExpenseCategory[];
  incomeLinks: CashFlowLink[];
  incomeNodes: IncomeSource[];
  totalIncome: number;
}

const HUB_ID = "hub:budget";
const SALARY = /salary|lön|wage|payroll/u;
const DIVIDEND = /dividend|divi/u;
const INTEREST = /interest|ränta/u;
const REFUND = /refund|return/u;

/** Income has no category enum, so its color is read off the source name. */
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

const sourceId = (name: string) => `income:${name}`;
const targetId = (label: string) => `expense:${label}`;

/** Maps a budget period's cash flow onto the generic sankey flow shape. */
export const toCashFlowSankey = ({
  expenseLinks,
  expenseNodes,
  incomeLinks,
  incomeNodes,
  totalIncome,
}: CashFlowData): SankeyFlow => {
  const links: SankeyLink[] = [
    ...incomeLinks.map((link) => ({
      source: sourceId(link.source),
      target: HUB_ID,
      value: link.value,
    })),
    ...expenseLinks.map((link) => ({
      source: HUB_ID,
      target: targetId(link.target),
      value: link.value,
    })),
  ];

  return {
    columns: [
      incomeNodes.map((node) => ({
        color: incomeColor(node.name),
        id: sourceId(node.name),
        label: node.name,
        value: node.value,
      })),
      [
        {
          color: "blue",
          id: HUB_ID,
          label: "Budget",
          value: totalIncome,
        },
      ],
      expenseNodes.map((node) => ({
        color: CATEGORY_COLORS[node.category],
        id: targetId(node.label),
        label: node.label,
        value: node.value,
      })),
    ],
    emphasizedId: HUB_ID,
    links,
  };
};

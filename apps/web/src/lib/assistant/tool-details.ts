import { isAssistantToolName } from "@freenary/api/assistant/tools";
import type { AssistantToolName } from "@freenary/api/assistant/tools";
import {
  CATEGORY_GROUPS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/taxonomy";
import type { ToolUIPart } from "ai";
import { z } from "zod";

import { categoryGroupLabel, categoryLabel } from "@/lib/taxonomy-labels";
import { m } from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime.js";

export const assistantToolNameOf = (
  partType: string
): AssistantToolName | null => {
  const name = partType.startsWith("tool-") ? partType.slice(5) : partType;
  return isAssistantToolName(name) ? name : null;
};

const TOOL_PURPOSES = {
  get_accounts_overview: m.assistant_tool_accounts_purpose,
  get_budget_vs_actual: m.assistant_tool_budget_vs_actual_purpose,
  get_cash_flow: m.assistant_tool_cash_flow_purpose,
  get_fixed_vs_variable: m.assistant_tool_fixed_vs_variable_purpose,
  get_recurring_expenses: m.assistant_tool_recurring_purpose,
  get_spending_by_group: m.assistant_tool_spending_purpose,
  search_transactions: m.assistant_tool_transactions_purpose,
} satisfies Record<AssistantToolName, () => string>;

/** What the lookup is for, in the reader's words; unknown tools get none. */
export const assistantToolPurpose = (partType: string): string | undefined => {
  const name = assistantToolNameOf(partType);
  return name ? TOOL_PURPOSES[name]() : undefined;
};

/**
 * The arguments the tools in `packages/api` accept, read leniently: a call
 * off the wire is shown, not validated, so every field is optional and an
 * unexpected one is ignored rather than refused.
 */
const toolInputSchema = z.looseObject({
  aggregation: z.enum(["total", "average", "median"]).optional(),
  categories: z.array(z.enum(SPENDING_CATEGORIES)).optional(),
  direction: z.enum(["incoming", "outgoing"]).optional(),
  from: z.string().optional(),
  groups: z.array(z.enum(CATEGORY_GROUPS)).optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  sort: z.enum(["date", "amount"]).optional(),
  to: z.string().optional(),
});

type ToolInput = z.infer<typeof toolInputSchema>;

/** The parts of a result the summary counts; the rows themselves stay raw. */
const toolOutputSchema = z.looseObject({
  accounts: z.array(z.unknown()).optional(),
  expenses: z.array(z.unknown()).optional(),
  groups: z.array(z.unknown()).optional(),
  periods: z.array(z.unknown()).optional(),
  transactions: z.array(z.unknown()).optional(),
});

export interface ToolParameter {
  label: string;
  value: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * A model-authored day: shown as a date when it is one, as written otherwise.
 * The shape check is not enough — `2026-13-01` matches it and `Intl` throws
 * on the Invalid Date — and a stored bad day would throw on every reload.
 */
const formatDay = (value: string): string => {
  const day = ISO_DAY.test(value) ? new Date(`${value}T00:00:00`) : null;
  return day === null || Number.isNaN(day.getTime())
    ? value
    : new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(day);
};

const listOf = (labels: string[]): string =>
  new Intl.ListFormat(getLocale(), { type: "conjunction" }).format(labels);

const AGGREGATION_LABELS = {
  average: m.budget_aggregation_average,
  median: m.budget_aggregation_median,
  total: m.budget_aggregation_total,
} satisfies Record<NonNullable<ToolInput["aggregation"]>, () => string>;

const DIRECTION_LABELS = {
  incoming: m.assistant_param_incoming,
  outgoing: m.assistant_param_outgoing,
} satisfies Record<NonNullable<ToolInput["direction"]>, () => string>;

const SORT_LABELS = {
  amount: m.budget_sort_amount,
  date: m.budget_sort_date,
} satisfies Record<NonNullable<ToolInput["sort"]>, () => string>;

/**
 * The call's arguments as labelled, formatted rows, in the order the tools
 * declare them: the period first, then how to read it, then the filters.
 */
export const toolParametersOf = (
  input: ToolUIPart["input"]
): ToolParameter[] => {
  const parsed = toolInputSchema.safeParse(input);
  if (!parsed.success) {
    return [];
  }
  const {
    aggregation,
    categories,
    direction,
    from,
    groups,
    limit,
    search,
    sort,
    to,
  } = parsed.data;

  const rows: (ToolParameter | null)[] = [
    from ? { label: m.assistant_param_from(), value: formatDay(from) } : null,
    to ? { label: m.assistant_param_to(), value: formatDay(to) } : null,
    aggregation
      ? {
          label: m.assistant_param_aggregation(),
          value: AGGREGATION_LABELS[aggregation](),
        }
      : null,
    direction
      ? {
          label: m.assistant_param_direction(),
          value: DIRECTION_LABELS[direction](),
        }
      : null,
    groups && groups.length > 0
      ? {
          label: m.assistant_param_groups(),
          value: listOf(groups.map(categoryGroupLabel)),
        }
      : null,
    categories && categories.length > 0
      ? {
          label: m.assistant_param_categories(),
          value: listOf(categories.map(categoryLabel)),
        }
      : null,
    search ? { label: m.assistant_param_search(), value: search } : null,
    sort
      ? { label: m.assistant_param_sort(), value: SORT_LABELS[sort]() }
      : null,
    limit === undefined
      ? null
      : { label: m.assistant_param_limit(), value: String(limit) },
  ];

  return rows.filter((row) => row !== null);
};

/** One line saying what came back, without the rows themselves. */
export const toolResultSummary = (part: ToolUIPart): string | undefined => {
  const parsed = toolOutputSchema.safeParse(part.output);
  if (!parsed.success) {
    return undefined;
  }
  const { accounts, expenses, groups, periods, transactions } = parsed.data;

  switch (assistantToolNameOf(part.type)) {
    case "get_accounts_overview": {
      return (
        accounts && m.assistant_result_accounts({ count: accounts.length })
      );
    }
    case "get_cash_flow": {
      return periods && m.assistant_result_periods({ count: periods.length });
    }
    case "get_spending_by_group":
    case "get_budget_vs_actual": {
      return groups && m.assistant_result_groups({ count: groups.length });
    }
    case "get_recurring_expenses": {
      return (
        expenses && m.assistant_result_recurring({ count: expenses.length })
      );
    }
    case "search_transactions": {
      return (
        transactions &&
        m.assistant_result_transactions({ count: transactions.length })
      );
    }
    case "get_fixed_vs_variable": {
      return m.assistant_result_figures();
    }
    default: {
      return undefined;
    }
  }
};

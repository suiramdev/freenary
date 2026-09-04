import { isAssistantToolName } from "@freenary/api/assistant/tools";
import type { AssistantToolName } from "@freenary/api/assistant/tools";

import { m } from "@/paraglide/messages.js";

/**
 * Tool names are the wire contract between the model and the API; the interface
 * is what translates them. The table holds message *functions*, not strings: it
 * is built once per process, so an evaluated string would pin one locale.
 * `satisfies` makes a new tool a compile error rather than a blank label.
 */
const ASSISTANT_TOOL_MESSAGES = {
  get_accounts_overview: m.assistant_tool_accounts,
  get_budget_vs_actual: m.assistant_tool_budget_vs_actual,
  get_cash_flow: m.assistant_tool_cash_flow,
  get_fixed_vs_variable: m.assistant_tool_fixed_vs_variable,
  get_recurring_expenses: m.assistant_tool_recurring,
  get_spending_by_group: m.assistant_tool_spending,
  search_transactions: m.assistant_tool_transactions,
} satisfies Record<AssistantToolName, () => string>;

/** `part.type` is `tool-<name>`; a name we do not know still gets a label. */
export const assistantToolLabel = (partType: string): string => {
  const name = partType.startsWith("tool-") ? partType.slice(5) : partType;

  return isAssistantToolName(name)
    ? ASSISTANT_TOOL_MESSAGES[name]()
    : m.assistant_tool_unknown();
};

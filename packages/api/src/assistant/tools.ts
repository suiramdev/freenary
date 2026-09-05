import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";

import { CATEGORY_GROUPS, SPENDING_CATEGORIES } from "../lib/taxonomy";
import type { AppRouterClient } from "../routers/index";

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

const period = {
  from: DAY.describe("inclusive first day, YYYY-MM-DD"),
  to: DAY.describe("inclusive last day, YYYY-MM-DD"),
};

const aggregation = z
  .enum(["total", "average", "median"])
  .default("total")
  .describe("total over the period, or the per-month average or median");

/** A `to` at midnight would drop that day's transactions. */
const rangeOf = (from: string, to: string) => ({
  from: new Date(`${from}T00:00:00.000Z`),
  to: new Date(`${to}T23:59:59.999Z`),
});

/**
 * Minor units to a decimal string. A model asked to divide by 100 itself does it
 * for some rows of a list and not others, presenting a €120 budget as €12,000;
 * a string, not a number, because that is a figure to repeat, not to compute
 * with, and JSON floats reintroduce the rounding this model stores integers to
 * avoid.
 */
const major = (minor: number): string => (minor / 100).toFixed(2);

/**
 * Every tool the assistant may call. The factory below is checked against this,
 * so a tool cannot be added without naming it — and the interface's label table
 * is checked against it too, so a new tool cannot ship untranslated.
 */
export type AssistantToolName = keyof typeof ASSISTANT_TOOL_NAMES;

const ASSISTANT_TOOL_NAMES = {
  get_accounts_overview: true,
  get_budget_vs_actual: true,
  get_cash_flow: true,
  get_fixed_vs_variable: true,
  get_recurring_expenses: true,
  get_spending_by_group: true,
  search_transactions: true,
} as const;

/**
 * Read-only tools over the financial model. Each one calls the very procedure
 * the interface calls, through a server-side router client, so an answer here
 * and a chart in Budget cannot disagree.
 *
 * Amounts leave as decimal strings beside their currency: the procedures answer
 * the interface, which knows they are minor units, and the model does not.
 */
export const assistantTools = (api: AppRouterClient) =>
  ({
    get_accounts_overview: tool({
      description:
        "List the user's bank accounts and the date range transaction data covers. Call this first when you do not know whether any account is connected.",
      // The procedure carries IBANs because the interface shows them. No tool
      // takes one as input, so they never reach the model provider — and never
      // land in the stored transcript that replays to it every turn.
      execute: async () => {
        const { accounts, ...range } = await api.budget.getAccounts();

        return {
          ...range,
          accounts: accounts.map(({ id, institutionName, name }) => ({
            id,
            institutionName,
            name,
          })),
        };
      },
      inputSchema: z.object({}),
    }),

    get_budget_vs_actual: tool({
      description:
        "Compare the user's declared monthly budget with what they actually spent, per category group.",
      execute: async ({ aggregation: mode, from, to }) => {
        const { groups, hasPlan } = await api.budget.getBudgetVsActual({
          aggregation: mode,
          ...rangeOf(from, to),
        });

        return {
          currency: "EUR",
          groups: groups.map(({ actual, group, planned }) => ({
            actual: major(actual),
            group,
            planned: major(planned),
          })),
          hasPlan,
        };
      },
      inputSchema: z.object({ aggregation, ...period }),
    }),

    get_cash_flow: tool({
      description:
        "Incoming and outgoing totals over time for a period, bucketed by day, week or month depending on its length.",
      execute: async ({ from, to }) => {
        const { periods } = await api.budget.getCashFlow(rangeOf(from, to));

        return {
          currency: "EUR",
          periods: periods.map(({ incoming, label, outgoing }) => ({
            incoming: major(incoming),
            label,
            outgoing: major(outgoing),
          })),
        };
      },
      inputSchema: z.object(period),
    }),

    get_fixed_vs_variable: tool({
      description:
        "Split outgoings into the part that recurs (rent, subscriptions, insurance) and the part that does not.",
      execute: async ({ aggregation: mode, from, to }) => {
        const { fixed, variable } = await api.budget.getFixedVsVariable({
          aggregation: mode,
          ...rangeOf(from, to),
        });

        return {
          currency: "EUR",
          fixed: major(fixed),
          variable: major(variable),
        };
      },
      inputSchema: z.object({ aggregation, ...period }),
    }),

    get_recurring_expenses: tool({
      description:
        "Recurring payments detected over the trailing year, with their cadence, typical amount and next expected date.",
      execute: async () => {
        const { expenses } = await api.budget.getRecurringExpenses();

        return {
          expenses: expenses.map(({ typicalAmountMinor, ...rest }) => ({
            ...rest,
            typicalAmount: major(typicalAmountMinor),
          })),
        };
      },
      inputSchema: z.object({}),
    }),

    get_spending_by_group: tool({
      description:
        "Outgoing totals per category group for a period. The cheapest way to answer 'where did my money go'.",
      execute: async ({ aggregation: mode, from, to }) => {
        const { groups } = await api.budget.getSpendingBreakdown({
          aggregation: mode,
          ...rangeOf(from, to),
        });

        return {
          currency: "EUR",
          groups: groups.map(({ amount, group }) => ({
            group,
            total: major(amount),
          })),
        };
      },
      inputSchema: z.object({ aggregation, ...period }),
    }),

    search_transactions: tool({
      description:
        "Individual transactions in a period, optionally filtered by free text, category, category group or direction. Returns ids so an answer can point at the rows behind it.",
      execute: async ({
        categories,
        direction,
        from,
        groups,
        limit,
        search,
        sort,
        to,
      }) => {
        const { totals, transactions } = await api.budget.getTransactions({
          categories,
          direction,
          groups,
          limit,
          search,
          sort,
          ...rangeOf(from, to),
        });

        return {
          totals: {
            currency: "EUR",
            incoming: major(totals.incoming),
            outgoing: major(totals.outgoing),
          },
          transactions: transactions.map(({ amount, ...rest }) => ({
            ...rest,
            amount: major(amount),
          })),
        };
      },
      inputSchema: z.object({
        categories: z.array(z.enum(SPENDING_CATEGORIES)).optional(),
        direction: z.enum(["incoming", "outgoing"]).optional(),
        groups: z.array(z.enum(CATEGORY_GROUPS)).optional(),
        // The procedure allows 100; a hundred raw bank descriptors per turn would
        // crowd out the conversation itself.
        limit: z.number().int().min(1).max(20).default(10),
        search: z.string().optional(),
        sort: z.enum(["date", "amount"]).default("date"),
        ...period,
      }),
    }),
  }) satisfies Record<AssistantToolName, Tool>;

/**
 * Membership test for a name off the wire, so the interface can translate a
 * tool row without asserting its way into the table.
 */
export const isAssistantToolName = (
  value: string
): value is AssistantToolName => Object.hasOwn(ASSISTANT_TOOL_NAMES, value);

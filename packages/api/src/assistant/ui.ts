import { createLibrary, defineComponent } from "@openuidev/lang-core";
import { z } from "zod";

/**
 * The components the model may compose into an answer, as OpenUI Lang. This
 * module owns the schemas and the prompt; `apps/web` attaches a renderer to
 * each definition, so the two sides cannot describe different components.
 *
 * Zod key order is the positional argument order the model writes, so the
 * shapes below are ordered by importance, not by name.
 */

const currency = z.string().optional();

/** One line or bar group: a named sequence aligned with the chart's labels. */
const series = z.object({
  name: z.string(),
  values: z.array(z.number()),
});

const stat = defineComponent({
  component: undefined,
  description:
    "One headline figure with its label, for example a total or a balance.",
  name: "Stat",
  // eslint-disable-next-line sort-keys -- positional argument order
  props: z.object({
    label: z.string(),
    value: z.number(),
    currency,
  }),
});

const barChart = defineComponent({
  component: undefined,
  description:
    "Compares amounts across labels, for example categories or months. Every series has one value per label.",
  name: "BarChart",
  // eslint-disable-next-line sort-keys -- positional argument order
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(series),
    currency,
  }),
});

const lineChart = defineComponent({
  component: undefined,
  description:
    "A trend over time. Labels are periods in order; every series has one value per label.",
  name: "LineChart",
  // eslint-disable-next-line sort-keys -- positional argument order
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(series),
    currency,
  }),
});

const donutChart = defineComponent({
  component: undefined,
  description:
    "Shares of one total, for example spending by category group. One value per label.",
  name: "DonutChart",
  // eslint-disable-next-line sort-keys -- positional argument order
  props: z.object({
    labels: z.array(z.string()),
    values: z.array(z.number()),
    currency,
  }),
});

const card = defineComponent({
  component: undefined,
  description:
    "The root of every program: a titled block holding stats and at most one chart.",
  name: "Card",
  // eslint-disable-next-line sort-keys -- positional argument order
  props: z.object({
    title: z.string(),
    children: z.array(
      z.union([stat.ref, barChart.ref, lineChart.ref, donutChart.ref])
    ),
  }),
});

export const ASSISTANT_UI = {
  BarChart: barChart,
  Card: card,
  DonutChart: donutChart,
  LineChart: lineChart,
  Stat: stat,
} as const;

/** The prompt side of the library: signatures only, no renderer attached. */
const promptLibrary = createLibrary({
  componentGroups: [
    {
      components: ["Card", "Stat", "BarChart", "LineChart", "DonutChart"],
      name: "Charts",
      notes: [
        "- BarChart compares amounts across labels, LineChart shows a trend over periods, DonutChart shows shares of one total.",
        "- Stat is for one headline figure. Put it before the chart in the Card's children.",
      ],
    },
  ],
  components: Object.values(ASSISTANT_UI),
  root: "Card",
});

const PREAMBLE = `## Charts

Answer in prose. When the figures you quote form a series — several periods, several categories or groups, a planned amount against an actual one — add one chart after the prose. A chart is a program in openui-lang, a declarative UI language, inside a fenced code block tagged \`openui-lang\`. A question answered by one figure or by yes or no gets no chart.`;

const ADDITIONAL_RULES = [
  // The generator always appends its stock "tables for comparisons, forms for
  // input" rule; this one, appended after it, names what actually exists.
  "Card, Stat, BarChart, LineChart and DonutChart are the only components. There is no table, no form and no other component.",
  "Every series holds exactly one value per label, in the same order as the labels.",
  "Chart only figures a tool returned. Never invent, round off or extrapolate a data point.",
  'Values are the decimal amounts a tool returned, in the currency it named. Pass that currency code, for example "EUR".',
  "Write the title and the labels in the user's language. Name categories and groups naturally, never as slugs.",
  "At most one fenced openui-lang block per answer. Write the prose first, then the block, then nothing or one short sentence.",
  "Never mention openui-lang, the code or the components to the user, and never put openui-lang outside a fenced block.",
];

const EXAMPLES = [
  `Question: "Where did my money go in March?"

You spent 1,834.20 € in March. Daily living was the largest group, ahead of housing and eating out.

\`\`\`openui-lang
root = Card("Spending by group, March 2026", [total, chart])
total = Stat("Total spent", 1834.2, "EUR")
chart = DonutChart(["Daily living", "Housing", "Eating out"], [820.5, 700, 313.7], "EUR")
\`\`\``,
  `Question: "How did income and spending compare over the last three months?"

Income stayed flat at about 3,200 € while spending fell from 2,975 € in February to 2,650.90 € in March.

\`\`\`openui-lang
root = Card("Income and spending, January to March 2026", [chart])
chart = BarChart(["January", "February", "March"], [{name: "Incoming", values: [3200, 3200, 3350]}, {name: "Outgoing", values: [2810.4, 2975, 2650.9]}], "EUR")
\`\`\``,
];

let cachedPrompt: string | undefined;

/**
 * The chart section of the system prompt. Built once: the library is static,
 * and the generator walks every schema on each call.
 */
export const assistantUiPrompt = (): string => {
  cachedPrompt ??= promptLibrary.prompt({
    additionalRules: ADDITIONAL_RULES,
    bindings: false,
    examples: EXAMPLES,
    preamble: PREAMBLE,
    toolCalls: false,
  });

  return cachedPrompt;
};

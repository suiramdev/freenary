# ADR-008: The Assistant Draws Charts In OpenUI Lang, From The Figures It Already Read

## Status

Accepted. Extends ADR-007, whose consequences listed "charts composed by the model" as absent.

## Context

"Visualize my spending over the year" is answered badly by a paragraph, and the Budget screen's charts cannot be reused as they are: each one is bound to a category group, a period selector and a click that filters the transaction list. The assistant needs a way to draw a chart for whatever series a question produced, without the model writing markup, without a second rendering pipeline, and without a new message type in the stored transcript.

[OpenUI](https://www.openui.com/) offers a line-oriented language, OpenUI Lang, in which a model composes only the components a library registers. The parser resolves forward references, so a program renders top-down while it streams, and a component the library does not know is dropped, not rendered.

## Decision

### 1. The chart travels inside the text part, as a fenced `openui-lang` block

The model answers in prose and may append one fenced block tagged `openui-lang`. Nothing changes on the wire or in `conversation_message.parts`: the block is text, the AI SDK streams it as text, and the row stores it as text. `apps/web/src/lib/assistant/answer-segments.ts` splits a text part into markdown segments and chart segments, and `assistant-message.tsx` hands the former to the markdown renderer and the latter to `<Renderer>` from `@openuidev/react-lang`.

Any other fence stays markdown. A fence still open at the end of the text is a chart in progress, and a trailing line that may still become the opener is held back, so the reader never sees the program as a code block.

A dedicated stream part would have been cleaner in principle, but it needs a custom data part on the server, a custom message type on the client, and a change to what the table stores. The fence needs none of that, and the model's own earlier charts replay to it as examples on every later turn.

### 2. One library, defined once, with no framework on the server

`packages/api/src/assistant/ui.ts` defines the five components — `Card`, `Stat`, `BarChart`, `LineChart`, `DonutChart` — with `defineComponent` from `@openuidev/lang-core`, which has no React dependency, and builds the prompt section from them with `library.prompt()`. `apps/web/src/components/assistant/assistant-ui-library.tsx` spreads each definition and attaches a renderer, and its renderer table `satisfies Record<keyof typeof ASSISTANT_UI, …>`, so a component added on the API side does not compile on the web side until it has a renderer. The shapes and the membership therefore agree by construction, and the server never imports React.

The Zod key order of every `props` schema is the positional argument order the model writes, so those shapes are ordered by importance and carry an `eslint-disable` for `sort-keys`.

### 3. Static programs: no `Query()`, no `$bindings`

The prompt is generated with `toolCalls: false` and `bindings: false`. OpenUI Lang can fetch live data from a tool provider in the browser and hold reactive state; the assistant uses neither. The model already read the figures through its tools, and a chart is a snapshot of that answer, exactly like the prose beside it. Running the oRPC procedures again from the browser would give the chart a second data path that the answer's lookup rows do not show, and every stored chart would re-query on each reload.

The stock inline-mode prompt section is not used either: it tells a model to answer a question with text only. The preamble, the rules and the examples in `ui.ts` say instead when a chart helps and when it does not.

### 4. The renderer draws on the Budget screen's primitives

The chart components render through `ChartContainer` from `packages/ui` and recharts, take their colours from `CHART_COLOR_VARS` in order, and format every amount through `lib/budget/format-currency.ts`. A chart in an answer and a chart on Budget therefore share one look.

## Consequences

- The parser is forgiving: an unknown component or a wrong argument drops that child and records an error, leaving a valid but empty `Card`. Once the fence closed, `assistant-chart.tsx` treats any recorded error, an empty root or no root as a broken chart and prints "The chart could not be drawn." in its place. The prose stays readable either way.
- A series shorter than its labels is not a parse error. The renderer draws the missing value as a gap and drops the slice, never as a zero: a plotted figure the model did not quote would be an invented one.
- Labels are the model's and may repeat, so the donut keys its slices and its config by position, not by label.
- Amounts are formatted as the decimals the tools returned, through `formatDecimalCurrency`; a round trip through minor units would lose the third decimal of the currencies that have one.
- The figures in a chart are the model's, not a procedure's. The prompt forbids charting a figure a tool did not return, but a model that sums weekly buckets into months itself charts its own arithmetic. The lookup rows above the answer remain the way to check it.
- `@openuidev/react-lang` auto-mounts an "OpenUI Inspect" widget when `NODE_ENV` is `development`, fetched from a CDN. Production builds fold it out. `@openuidev/lang-core` ships an installation-time telemetry script; Bun does not run lifecycle scripts for untrusted packages, so it never runs here, and its runtime telemetry stays off unless `OPENUI_RUNTIME_TELEMETRY_ENABLED` is set, which Freenary never sets.
- A new chart type is a new definition in `ui.ts` and a new renderer beside the others; the prompt updates itself.
- Copy copies the prose only. A pasted answer holds no program.

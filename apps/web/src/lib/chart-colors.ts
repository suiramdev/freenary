import type { CategoryColor } from "@freenary/api/lib/taxonomy";

/**
 * A series color as a CSS value, keyed by the palette `packages/api` owns.
 *
 * Tokens rather than literals: each one resolves differently under `.dark`, so a
 * series keeps its hue and its contrast when the reader switches appearance.
 */
export const CHART_COLOR_VARS = {
  blue: "var(--chart-blue)",
  green: "var(--chart-green)",
  grey: "var(--chart-grey)",
  orange: "var(--chart-orange)",
  pink: "var(--chart-pink)",
  purple: "var(--chart-purple)",
  red: "var(--chart-red)",
} satisfies Record<CategoryColor, string>;

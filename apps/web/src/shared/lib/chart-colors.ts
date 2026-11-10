import type { CategoryColor } from "@freenary/api/lib/taxonomy";

export const CHART_COLOR_VARS = {
  blue: "var(--chart-blue)",
  green: "var(--chart-green)",
  grey: "var(--chart-grey)",
  orange: "var(--chart-orange)",
  pink: "var(--chart-pink)",
  purple: "var(--chart-purple)",
  red: "var(--chart-red)",
} as const satisfies Record<CategoryColor, string>;

export type ChartColorVar =
  (typeof CHART_COLOR_VARS)[keyof typeof CHART_COLOR_VARS];

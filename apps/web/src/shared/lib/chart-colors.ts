import {
  CATEGORY_GROUP_OF,
  categoriesInGroup,
  categoryColor,
} from "@freenary/api/lib/taxonomy";
import type {
  CategoryColor,
  SpendingCategory,
} from "@freenary/api/lib/taxonomy";

export const CHART_COLOR_VARS = {
  blue: "var(--chart-blue)",
  green: "var(--chart-green)",
  grey: "var(--chart-grey)",
  orange: "var(--chart-orange)",
  pink: "var(--chart-pink)",
  purple: "var(--chart-purple)",
  red: "var(--chart-red)",
} satisfies Record<CategoryColor, string>;

const DEEPEST_STEP_TOWARDS_THE_BACKGROUND = 35;
const LIGHTEST_STEP_TOWARDS_THE_FOREGROUND = 45;

const shadeStepOf = (category: SpendingCategory): number => {
  const siblings = categoriesInGroup(CATEGORY_GROUP_OF[category]);
  const lastPlace = siblings.length - 1;
  const place = lastPlace === 0 ? 0 : siblings.indexOf(category) / lastPlace;

  return Math.round(
    DEEPEST_STEP_TOWARDS_THE_BACKGROUND -
      place *
        (DEEPEST_STEP_TOWARDS_THE_BACKGROUND +
          LIGHTEST_STEP_TOWARDS_THE_FOREGROUND)
  );
};

export const categoryChartColor = (category: SpendingCategory): string => {
  const groupHue = CHART_COLOR_VARS[categoryColor(category)];
  const step = shadeStepOf(category);

  if (step === 0) {
    return groupHue;
  }

  return step > 0
    ? `color-mix(in oklab, ${groupHue} ${100 - step}%, var(--background))`
    : `color-mix(in oklab, ${groupHue} ${100 + step}%, var(--foreground))`;
};

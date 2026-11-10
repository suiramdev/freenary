import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import type { ChartColorVar } from "@/shared/lib/chart-colors";

import type { AssetClass } from "./widget-query";

export const ASSET_CLASS_LABELS = {
  cash: m.home_asset_class_cash,
  investments: m.home_asset_class_investments,
  other: m.home_asset_class_other,
  property: m.home_asset_class_property,
  savings: m.home_asset_class_savings,
} satisfies Record<AssetClass, () => string>;

export const ASSET_CLASS_COLORS = {
  cash: CHART_COLOR_VARS.blue,
  investments: CHART_COLOR_VARS.purple,
  other: CHART_COLOR_VARS.grey,
  property: CHART_COLOR_VARS.orange,
  savings: CHART_COLOR_VARS.green,
} satisfies Record<AssetClass, ChartColorVar>;

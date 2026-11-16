import { m } from "@/paraglide/messages.js";

import { CHART_COLOR_VARS } from "../../lib/chart-colors";

export const SAMPLE_CURRENCY = "EUR";
export const SAMPLE_BALANCE_MINOR = 798_914;
export const SAMPLE_SPENT_MINOR = 128_450;
export const SAMPLE_SPENT_DIFFERENCE_MINOR = 6451;

const DAYS_SHOWN = 16;
const CURRENT_DAILY_MINOR = 7400;
const PREVIOUS_DAILY_MINOR = 6900;
const CURRENT_WOBBLE_MINOR = 2600;
const PREVIOUS_WOBBLE_MINOR = 1800;

export interface SamplePacePoint {
  currentMinor: number;
  day: number;
  previousMinor: number;
}

export const SAMPLE_PACE: readonly SamplePacePoint[] = Array.from(
  { length: DAYS_SHOWN },
  (_, index) => {
    const day = index + 1;

    return {
      currentMinor: Math.round(
        day * CURRENT_DAILY_MINOR + Math.sin(day) * CURRENT_WOBBLE_MINOR
      ),
      day,
      previousMinor: Math.round(
        day * PREVIOUS_DAILY_MINOR + Math.cos(day) * PREVIOUS_WOBBLE_MINOR
      ),
    };
  }
);

export interface SampleCategory {
  amountMinor: number;
  color: string;
  label: () => string;
  share: number;
}

export const SAMPLE_CATEGORIES: readonly SampleCategory[] = [
  {
    amountMinor: 41_230,
    color: CHART_COLOR_VARS.orange,
    label: m.category_groceries,
    share: 0.32,
  },
  {
    amountMinor: 23_115,
    color: CHART_COLOR_VARS.purple,
    label: m.category_transport_travel,
    share: 0.18,
  },
  {
    amountMinor: 15_420,
    color: CHART_COLOR_VARS.pink,
    label: m.category_restaurants,
    share: 0.12,
  },
  {
    amountMinor: 6337,
    color: CHART_COLOR_VARS.blue,
    label: m.category_subscriptions,
    share: 0.05,
  },
];

import {
  ChartBar,
  CurrencyDollar,
  Home,
  Settings,
  Target,
  Wallet,
} from "kubai-icons-react";
import type { KubaiIconComponent } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import type { ChartColorVar } from "@/shared/lib/chart-colors";

interface NavChild {
  label: () => string;
  routeId: string;
  to: string;
}

interface NavItem extends NavChild {
  children?: readonly NavChild[];
  color: ChartColorVar;
  icon: KubaiIconComponent;
  planned: boolean;
}

export type NavEntry = (typeof NAV_ITEMS)[number];

export type NavAreaEntry = Extract<NavEntry, { children: readonly unknown[] }>;

export const NAV_ITEMS = [
  {
    color: CHART_COLOR_VARS.blue,
    icon: Home,
    label: m.nav_home,
    planned: false,
    routeId: "/_auth/",
    to: "/",
  },
  {
    color: CHART_COLOR_VARS.purple,
    icon: Wallet,
    label: m.nav_portfolio,
    planned: true,
    routeId: "/_auth/portfolio",
    to: "/portfolio",
  },
  {
    children: [
      {
        label: m.nav_budget_transactions,
        routeId: "/_auth/budget/transactions",
        to: "/budget/transactions",
      },
      {
        label: m.nav_budget_recurring,
        routeId: "/_auth/budget/recurring",
        to: "/budget/recurring",
      },
    ],
    color: CHART_COLOR_VARS.green,
    icon: CurrencyDollar,
    label: m.nav_budget,
    planned: false,
    routeId: "/_auth/budget",
    to: "/budget",
  },
  {
    color: CHART_COLOR_VARS.orange,
    icon: ChartBar,
    label: m.nav_analysis,
    planned: true,
    routeId: "/_auth/analysis",
    to: "/analysis",
  },
  {
    color: CHART_COLOR_VARS.red,
    icon: Target,
    label: m.nav_goals,
    planned: true,
    routeId: "/_auth/goals",
    to: "/goals",
  },
  {
    color: CHART_COLOR_VARS.grey,
    icon: Settings,
    label: m.nav_settings,
    planned: false,
    routeId: "/_auth/settings",
    to: "/settings",
  },
] as const satisfies readonly NavItem[];

export const isNavArea = (item: NavEntry): item is NavAreaEntry =>
  Object.hasOwn(item, "children");

export const navTrailOf = (routeId: string | undefined): string[] => {
  for (const item of NAV_ITEMS) {
    if (item.routeId === routeId) {
      return [item.label()];
    }

    const child = isNavArea(item)
      ? item.children.find((entry) => entry.routeId === routeId)
      : undefined;

    if (child) {
      return [item.label(), child.label()];
    }
  }

  return [m.nav_home()];
};

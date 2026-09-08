import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiBarChartLine,
  RiHomeLine,
  RiMoneyDollarCircleLine,
  RiSettings3Line,
  RiTargetLine,
  RiWalletLine,
} from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

interface NavChild {
  /** The message function, so the label follows a locale change with the tree. */
  label: () => string;
  routeId: string;
  to: string;
}

interface NavItem extends NavChild {
  /** Nested pages of one area, shown under a collapsible parent row. */
  children?: readonly NavChild[];
  icon: RemixiconComponentType;
  planned: boolean;
}

/**
 * The authenticated shell's navigation, and the source of each page's title.
 *
 * `label` holds the message function rather than its result: this array is
 * built once per process, so an evaluated string would pin the first locale
 * seen and serve it to every later render.
 */
export const NAV_ITEMS = [
  {
    icon: RiHomeLine,
    label: m.nav_home,
    planned: false,
    routeId: "/_auth/",
    to: "/",
  },
  {
    icon: RiWalletLine,
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
    icon: RiMoneyDollarCircleLine,
    label: m.nav_budget,
    planned: false,
    routeId: "/_auth/budget",
    to: "/budget",
  },
  {
    icon: RiBarChartLine,
    label: m.nav_analysis,
    planned: true,
    routeId: "/_auth/analysis",
    to: "/analysis",
  },
  {
    icon: RiTargetLine,
    label: m.nav_goals,
    planned: true,
    routeId: "/_auth/goals",
    to: "/goals",
  },
  {
    icon: RiSettings3Line,
    label: m.nav_settings,
    planned: false,
    routeId: "/_auth/settings",
    to: "/settings",
  },
] as const satisfies readonly NavItem[];

export type NavEntry = (typeof NAV_ITEMS)[number];
/** An entry with pages of its own; `to` keeps its literal type for `Link`. */
export type NavAreaEntry = Extract<NavEntry, { children: readonly unknown[] }>;

export const isNavArea = (item: NavEntry): item is NavAreaEntry =>
  "children" in item;

/**
 * The breadcrumb for a page, outermost first: one entry for a top-level page
 * and two for a nested one, so a reader on Recurring keeps the area it belongs
 * to. An unknown route falls back to Home rather than an empty header.
 */
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

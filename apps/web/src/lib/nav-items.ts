import {
  RiBarChartLine,
  RiBrainLine,
  RiHomeLine,
  RiMoneyDollarCircleLine,
  RiSettings3Line,
  RiTargetLine,
  RiWalletLine,
} from "@remixicon/react";

import { m } from "@/paraglide/messages.js";

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
    icon: RiBrainLine,
    label: m.nav_ai,
    planned: true,
    routeId: "/_auth/ai",
    to: "/ai",
  },
  {
    icon: RiSettings3Line,
    label: m.nav_settings,
    planned: false,
    routeId: "/_auth/settings",
    to: "/settings",
  },
] as const;

export const navTitleOf = (routeId: string | undefined): string => {
  const label = NAV_ITEMS.find((item) => item.routeId === routeId)?.label;

  return label ? label() : m.nav_home();
};

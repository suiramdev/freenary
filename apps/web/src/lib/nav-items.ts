import {
  BrainIcon,
  ChartBarIcon,
  CurrencyCircleDollarIcon,
  HouseIcon,
  TargetIcon,
  WalletIcon,
} from "@phosphor-icons/react";

/** The authenticated shell's navigation, and the source of each page's title. */
export const NAV_ITEMS = [
  {
    icon: HouseIcon,
    planned: false,
    routeId: "/_auth/",
    title: "Home",
    to: "/",
  },
  {
    icon: WalletIcon,
    planned: true,
    routeId: "/_auth/portfolio",
    title: "Portfolio",
    to: "/portfolio",
  },
  {
    icon: CurrencyCircleDollarIcon,
    planned: false,
    routeId: "/_auth/budget",
    title: "Budget",
    to: "/budget",
  },
  {
    icon: ChartBarIcon,
    planned: true,
    routeId: "/_auth/analysis",
    title: "Analysis",
    to: "/analysis",
  },
  {
    icon: TargetIcon,
    planned: true,
    routeId: "/_auth/goals",
    title: "Goals",
    to: "/goals",
  },
  {
    icon: BrainIcon,
    planned: true,
    routeId: "/_auth/ai",
    title: "AI",
    to: "/ai",
  },
] as const;

export const navTitleOf = (routeId: string | undefined): string =>
  NAV_ITEMS.find((item) => item.routeId === routeId)?.title ?? "Home";

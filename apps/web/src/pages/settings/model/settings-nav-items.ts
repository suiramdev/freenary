import { CurrencyDollar, Link, Palette, ShieldLock } from "kubai-icons-react";
import type { KubaiIconComponent } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";
import type { SettingsSection } from "@/shared/config";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import type { ChartColorVar } from "@/shared/lib/chart-colors";

export type OperatorStanding = "member" | "operator" | "pending";

interface SettingsNavItem {
  color: ChartColorVar;
  icon: KubaiIconComponent;
  label: () => string;
  section: SettingsSection;
}

export const SETTINGS_NAV_ITEMS = [
  {
    color: CHART_COLOR_VARS.pink,
    icon: Palette,
    label: m.settings_group_appearance_title,
    section: "appearance",
  },
  {
    color: CHART_COLOR_VARS.blue,
    icon: Link,
    label: m.settings_group_connections_title,
    section: "connections",
  },
  {
    color: CHART_COLOR_VARS.green,
    icon: CurrencyDollar,
    label: m.settings_group_budget_title,
    section: "budget",
  },
  {
    color: CHART_COLOR_VARS.purple,
    icon: ShieldLock,
    label: m.settings_group_security_title,
    section: "security",
  },
] as const satisfies readonly SettingsNavItem[];

interface OperatorStatus {
  isOperator: boolean | undefined;
  isPending: boolean;
}

export const operatorStandingOf = ({
  isOperator,
  isPending,
}: OperatorStatus): OperatorStanding => {
  if (isPending) {
    return "pending";
  }

  return isOperator === true ? "operator" : "member";
};

export const showsServices = (standing: OperatorStanding): boolean =>
  standing === "operator";

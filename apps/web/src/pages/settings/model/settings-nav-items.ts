import {
  RiBankLine,
  RiMoneyDollarCircleLine,
  RiPaletteLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import type { SettingsSection } from "@/shared/config";

interface SettingsNavItem {
  icon: RemixiconComponentType;
  label: () => string;
  section: SettingsSection;
}

export const SETTINGS_NAV_ITEMS = [
  {
    icon: RiPaletteLine,
    label: m.settings_group_appearance_title,
    section: "appearance",
  },
  {
    icon: RiBankLine,
    label: m.settings_group_connections_title,
    section: "connections",
  },
  {
    icon: RiMoneyDollarCircleLine,
    label: m.settings_group_budget_title,
    section: "budget",
  },
  {
    icon: RiShieldKeyholeLine,
    label: m.settings_group_security_title,
    section: "security",
  },
] as const satisfies readonly SettingsNavItem[];

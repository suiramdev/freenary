import {
  RiBankLine,
  RiMoneyDollarCircleLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import type { SettingsSection } from "@/shared/config";

export interface FirstStepsState {
  hasAccountProtection: boolean;
  hasBankConnection: boolean;
  hasBudgetLine: boolean;
}

interface FirstStep {
  icon: RemixiconComponentType;
  id: string;
  isDone: (state: FirstStepsState) => boolean;
  label: () => string;
  section: SettingsSection;
  to: string;
}

export const FIRST_STEPS = [
  {
    icon: RiBankLine,
    id: "bank-connection",
    isDone: (state) => state.hasBankConnection,
    label: m.first_steps_connect_bank,
    section: "connections",
    to: "/settings",
  },
  {
    icon: RiMoneyDollarCircleLine,
    id: "budgeting-profile",
    isDone: (state) => state.hasBudgetLine,
    label: m.first_steps_budgeting_profile,
    section: "budget",
    to: "/settings",
  },
  {
    icon: RiShieldKeyholeLine,
    id: "account-protection",
    isDone: (state) => state.hasAccountProtection,
    label: m.first_steps_protect_account,
    section: "security",
    to: "/settings",
  },
] as const satisfies readonly FirstStep[];

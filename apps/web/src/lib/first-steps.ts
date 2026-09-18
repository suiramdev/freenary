import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiBankLine,
  RiMoneyDollarCircleLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";

import {
  BANK_ACCOUNTS_ANCHOR,
  BUDGETING_ANCHOR,
  SECURITY_ANCHOR,
} from "@/lib/settings/anchors";
import { m } from "@/paraglide/messages.js";

export interface FirstStepsState {
  hasAccountProtection: boolean;
  hasBankConnection: boolean;
  hasBudgetLine: boolean;
}

interface FirstStep {
  hash: string;
  icon: RemixiconComponentType;
  id: string;
  isDone: (state: FirstStepsState) => boolean;
  label: () => string;
  to: string;
}

export const FIRST_STEPS = [
  {
    hash: BANK_ACCOUNTS_ANCHOR,
    icon: RiBankLine,
    id: "bank-connection",
    isDone: (state) => state.hasBankConnection,
    label: m.first_steps_connect_bank,
    to: "/settings",
  },
  {
    hash: BUDGETING_ANCHOR,
    icon: RiMoneyDollarCircleLine,
    id: "budgeting-profile",
    isDone: (state) => state.hasBudgetLine,
    label: m.first_steps_budgeting_profile,
    to: "/settings",
  },
  {
    hash: SECURITY_ANCHOR,
    icon: RiShieldKeyholeLine,
    id: "account-protection",
    isDone: (state) => state.hasAccountProtection,
    label: m.first_steps_protect_account,
    to: "/settings",
  },
] as const satisfies readonly FirstStep[];

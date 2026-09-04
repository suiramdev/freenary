import type { RemixiconComponentType } from "@remixicon/react";
import { RiBankLine, RiMoneyDollarCircleLine } from "@remixicon/react";

import { BANK_ACCOUNTS_ANCHOR, BUDGETING_ANCHOR } from "@/lib/settings/anchors";
import { m } from "@/paraglide/messages.js";

/** What the steps are judged against: one field per step, read from real records. */
export interface FirstStepsState {
  hasBankConnection: boolean;
  hasBudgetLine: boolean;
}

interface FirstStep {
  hash: string;
  icon: RemixiconComponentType;
  id: string;
  isDone: (state: FirstStepsState) => boolean;
  /** The message function, so the label follows a locale change with the tree. */
  label: () => string;
  to: string;
}

/** A further step needs a row here, a field on FirstStepsState, and its query in useFirstSteps. */
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
] as const satisfies readonly FirstStep[];

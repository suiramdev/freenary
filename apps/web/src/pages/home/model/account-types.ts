import { m } from "@/paraglide/messages.js";

import type { PortfolioOverview } from "./widget-query";

type AccountType = PortfolioOverview["accounts"][number]["type"];

export const ACCOUNT_TYPE_LABELS = {
  BROKERAGE: m.home_account_type_brokerage,
  CARD: m.home_account_type_card,
  CHECKING: m.home_account_type_checking,
  CROWDLENDING: m.home_account_type_crowdlending,
  EMPLOYEE_SAVINGS: m.home_account_type_employee_savings,
  LIFE_INSURANCE: m.home_account_type_life_insurance,
  LOAN: m.home_account_type_loan,
  REAL_ESTATE: m.home_account_type_real_estate,
  RETIREMENT: m.home_account_type_retirement,
  SAVINGS: m.home_account_type_savings,
  UNKNOWN: m.home_account_type_unknown,
} satisfies Record<AccountType, () => string>;

import { Wallet } from "kubai-icons-react";

import { m } from "@/paraglide/messages.js";
import { CHART_COLOR_VARS } from "@/shared/lib/chart-colors";
import { PlannedPage } from "@/shared/ui/planned-page";

export const PortfolioPage = () => (
  <PlannedPage
    description={m.shell_planned_portfolio_description()}
    color={CHART_COLOR_VARS.purple}
    icon={Wallet}
    title={m.shell_planned_title({ page: m.nav_portfolio() })}
  />
);

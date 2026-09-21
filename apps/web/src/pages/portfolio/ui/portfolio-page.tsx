import { RiWalletLine } from "@remixicon/react";

import { m } from "@/paraglide/messages.js";
import { PlannedPage } from "@/shared/ui/planned-page";

export const PortfolioPage = () => (
  <PlannedPage
    description={m.shell_planned_portfolio_description()}
    icon={RiWalletLine}
    title={m.shell_planned_title({ page: m.nav_portfolio() })}
  />
);

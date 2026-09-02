import { RiWalletLine } from "@remixicon/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";
import { m } from "@/paraglide/messages.js";

const PortfolioPage = () => (
  <PlannedPage
    description={m.shell_planned_portfolio_description()}
    icon={RiWalletLine}
    title={m.shell_planned_title({ page: m.nav_portfolio() })}
  />
);

export const Route = createFileRoute("/_auth/portfolio")({
  component: PortfolioPage,
});

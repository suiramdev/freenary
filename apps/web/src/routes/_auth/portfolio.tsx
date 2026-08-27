import { WalletIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { PlannedPage } from "@/components/shared/planned-page";

const PortfolioPage = () => (
  <PlannedPage
    description="Track your holdings, accounts and net worth across all your connections — coming soon."
    icon={WalletIcon}
    title="Portfolio is planned"
  />
);

export const Route = createFileRoute("/_auth/portfolio")({
  component: PortfolioPage,
});

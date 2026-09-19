import { createFileRoute } from "@tanstack/react-router";

import { PortfolioPage } from "@/pages/portfolio";

export const Route = createFileRoute("/_auth/portfolio")({
  component: PortfolioPage,
});
